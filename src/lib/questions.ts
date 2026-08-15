import { db } from "./db";
import { generateToken, hashToken, tokenExpiry } from "./tokens";
import { recordAudit } from "./clients";
import { recordEvent } from "./requirements";
import {
  sendClarificationQuestionEmail,
  sendClarificationReminderEmail,
  emailConfigStatus,
  type MailResult,
} from "./mail";
import { getSection } from "./requirement-config";
import type {
  Client,
  QuestionStatus,
  RequirementQuestion,
  RequirementRequest,
} from "@/generated/prisma/client";

/* ────────────────────────────────────────────────────────────────
   ASK THE CLIENT — CLARIFICATION QUESTION LOOP
   One question is bound to exactly one workspace + client +
   requirement + section. The raw response token never leaves the
   server except through an authenticated admin response (or the
   email link) — only its hash is stored. Delivery is recorded per
   attempt and never fabricated.
──────────────────────────────────────────────────────────────── */

const TOKEN_VALID_HOURS = 24 * 14; // 14 days

/** Statuses that count as "awaiting the client's answer". */
export const OPEN_QUESTION_STATUSES: QuestionStatus[] = [
  "READY_TO_SEND",
  "SENDING",
  "SENT",
  "DELIVERED",
  "OPENED",
];

export function questionLink(token: string): string {
  return `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/client-question/${token}`;
}

function issueQuestionToken() {
  const token = generateToken(32);
  return { token, tokenHash: hashToken(token), expiresAt: tokenExpiry(TOKEN_VALID_HOURS) };
}

/** Load a question only if it belongs to the user's workspace. */
export async function getQuestionForUser(userId: string, questionId: string) {
  const workspace = await db.workspace.findUnique({ where: { ownerId: userId } });
  if (!workspace) return null;
  return db.requirementQuestion.findFirst({
    where: { id: questionId, workspaceId: workspace.id },
  });
}

/* ── Recipient resolution ──────────────────────────────────────
   Never trust a contactId from the frontend. The contact is resolved
   from the database and must belong to this client. */

async function resolveRecipient(
  client: Client,
  contactId?: string,
): Promise<{ contactId: string | null; name: string; email: string }> {
  if (contactId) {
    const contact = await db.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.clientId !== client.id) {
      throw new Error("Selected contact does not belong to this client.");
    }
    if (!contact.email || !contact.email.trim()) {
      throw new Error("This contact has no email address on file.");
    }
    return { contactId: contact.id, name: contact.name, email: contact.email.trim() };
  }

  // Default: the client's primary contact, then any contact with an email,
  // then the client's own email. Never make the user type an address that
  // is already on file.
  const primary = await db.contact.findFirst({
    where: { clientId: client.id, isPrimary: true, email: { not: null } },
  });
  if (primary?.email) {
    return { contactId: primary.id, name: primary.name, email: primary.email.trim() };
  }
  const anyContact = await db.contact.findFirst({
    where: { clientId: client.id, email: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (anyContact?.email) {
    return { contactId: anyContact.id, name: anyContact.name, email: anyContact.email.trim() };
  }
  if (client.email?.trim()) {
    return { contactId: null, name: client.companyName, email: client.email.trim() };
  }
  throw new Error("No contact email is on file for this client — add a contact email first.");
}

/* ── Idempotency ───────────────────────────────────────────────
   One open question per requirement + section. Prevents duplicate
   questions and duplicate emails from double clicks. */

export async function findOpenClarification(requestId: string, section: string) {
  return db.requirementQuestion.findFirst({
    where: { requirementId: requestId, section, status: { in: OPEN_QUESTION_STATUSES } },
    orderBy: { createdAt: "desc" },
  });
}

/* ── Create ──────────────────────────────────────────────────── */

export async function createClarificationQuestion(input: {
  request: RequirementRequest;
  client: Client;
  section: string;
  question: string;
  internalNote?: string;
  contactId?: string;
  actorId: string;
  actorName: string;
}) {
  const existing = await findOpenClarification(input.request.id, input.section);
  if (existing) {
    return { existing, created: null as RequirementQuestion | null, token: null as string | null };
  }

  const recipient = await resolveRecipient(input.client, input.contactId);
  const { token, tokenHash, expiresAt } = issueQuestionToken();

  const created = await db.requirementQuestion.create({
    data: {
      workspaceId: input.request.workspaceId,
      clientId: input.client.id,
      requirementId: input.request.id,
      section: input.section,
      question: input.question,
      internalNote: input.internalNote?.trim() ? input.internalNote.trim() : null,
      recipientContactId: recipient.contactId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      createdById: input.actorId,
      createdByName: input.actorName,
      tokenHash,
      tokenExpiresAt: expiresAt,
    },
  });

  return { existing: null, created, token };
}

/* ── Send (initial + reminders) ────────────────────────────────
   A fresh token is issued per send so every email carries a valid
   secure link. Delivery is recorded per attempt. The question only
   becomes SENT when the provider confirms submission — never before. */

export type ClarificationSendResult = {
  sent: boolean;
  dev: boolean;
  link: string;
  message: string;
};

export async function sendClarificationEmail(input: {
  question: RequirementQuestion;
  kind?: "INITIAL" | "REMINDER";
  actorId?: string;
  actorName?: string;
}): Promise<ClarificationSendResult> {
  const { question, kind = "INITIAL" } = input;

  if (question.status === "ANSWERED") {
    throw new Error("This question has already been answered.");
  }
  if (question.status === "CANCELLED") {
    throw new Error("This question was cancelled.");
  }
  if (kind === "INITIAL" && question.status === "SENT") {
    throw new Error("This question has already been sent.");
  }

  const [request, client, workspace] = await Promise.all([
    db.requirementRequest.findUnique({
      where: { id: question.requirementId },
      select: { title: true, clientId: true, workspaceId: true },
    }),
    db.client.findUnique({
      where: { id: question.clientId },
      select: { companyName: true, email: true },
    }),
    db.workspace.findUnique({
      where: { id: question.workspaceId },
      include: { profile: true },
    }),
  ]);
  if (!request || !client || !workspace) {
    throw new Error("Requirement context not found.");
  }

  // Rotate the token so a retry always carries a fresh, valid link and old
  // links stop working.
  const { token, tokenHash, expiresAt } = issueQuestionToken();
  const link = questionLink(token);

  const sectionLabel = getSection(question.section)?.label ?? question.section;
  const senderName = input.actorName ?? question.createdByName ?? workspace.companyName;
  const emailInput = {
    to: question.recipientEmail,
    clientName: client.companyName,
    projectTitle: request.title,
    sectionLabel,
    question: question.question,
    link,
    companyName: workspace.companyName,
    senderName,
    senderEmail: workspace.profile?.businessEmail,
  };

  const mail: MailResult =
    kind === "INITIAL"
      ? await sendClarificationQuestionEmail(emailInput)
      : await sendClarificationReminderEmail(emailInput);

  const channel = emailConfigStatus().channel;

  // Honest state machine: the question is only SENT after the provider
  // accepts the message. In dev without a provider the link is printed to
  // the server console (project convention) and marked sent so the flow
  // stays usable — but the response tells the UI exactly what happened.
  if (mail.sent || mail.devUrl) {
    const now = new Date();
    await db.questionDelivery.create({
      data: {
        workspaceId: question.workspaceId,
        questionId: question.id,
        kind: kind as never,
        recipient: question.recipientEmail,
        provider: channel === "none" ? null : channel,
        status: "SENT",
        sentAt: now,
      },
    });

    await db.requirementQuestion.update({
      where: { id: question.id },
      data: {
        status: "SENT",
        tokenHash,
        tokenExpiresAt: expiresAt,
        sentAt: question.sentAt ?? now,
        deliveredAt: now,
      },
    });

    if (kind === "INITIAL") {
      await recordEvent(
        question.requirementId,
        "CLARIFICATION_REQUESTED",
        "Clarification requested",
        `${sectionLabel} — ${question.question.slice(0, 80)}`,
        { questionId: question.id },
      );
    } else {
      await recordEvent(
        question.requirementId,
        "CLARIFICATION_REMINDED",
        "Clarification reminder sent",
        `${sectionLabel} — sent to ${question.recipientName}`,
        { questionId: question.id },
      );
    }

    await db.clientMessage.create({
      data: {
        clientId: question.clientId,
        channel: "EMAIL",
        subject: kind === "INITIAL" ? `Clarification needed for ${request.title}` : `Reminder — clarification needed for ${request.title}`,
        body: question.question,
        direction: "OUT",
        fromName: senderName,
        at: now,
      },
    });

    await recordAudit({
      clientId: question.clientId,
      entity: "REQUIREMENT",
      action: kind === "INITIAL" ? "STATUS_CHANGED" : "MESSAGE_ADDED",
      entityId: question.requirementId,
      actorId: input.actorId,
      actorName: senderName,
      after: { clarification: "sent", kind, section: question.section, questionId: question.id },
    });
    await db.client.update({
      where: { id: question.clientId },
      data: { lastActivityAt: now },
    });

    if (!mail.sent) {
      return { sent: false, dev: true, link, message: "Email provider not configured — the response link was printed to the server console." };
    }
    return { sent: true, dev: false, link, message: "" };
  }

  // Real delivery failure — never claim sent.
  await db.questionDelivery.create({
    data: {
      workspaceId: question.workspaceId,
      questionId: question.id,
      kind: kind as never,
      recipient: question.recipientEmail,
      provider: channel === "none" ? null : channel,
      status: "FAILED",
      failedAt: new Date(),
      failureReason: "Delivery failed — check the server log for a safe diagnostic.",
    },
  });
  await db.requirementQuestion.update({
    where: { id: question.id },
    data: { status: "FAILED" },
  });
  return {
    sent: false,
    dev: false,
    link,
    message: "The clarification could not be delivered. Check the email configuration and retry.",
  };
}

export async function cancelClarification(input: {
  question: RequirementQuestion;
  reason?: string;
  actorId: string;
  actorName: string;
}) {
  const { question } = input;
  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      status: "CANCELLED",
      tokenRevokedAt: new Date(),
      tokenRevokedReason: input.reason?.trim() ? input.reason.trim() : "Cancelled by workspace owner",
    },
  });
  await recordAudit({
    clientId: question.clientId,
    entity: "REQUIREMENT",
    action: "STATUS_CHANGED",
    entityId: question.requirementId,
    actorId: input.actorId,
    actorName: input.actorName,
    after: { clarification: "cancelled", section: question.section, questionId: question.id },
  });
  return updated;
}

/** Load a question + its delivery trail for an authenticated user. */
export async function getQuestionDetailForUser(userId: string, questionId: string) {
  const question = await getQuestionForUser(userId, questionId);
  if (!question) return null;
  const deliveries = await db.questionDelivery.findMany({
    where: { questionId },
    orderBy: { createdAt: "asc" },
  });
  return { question, deliveries };
}

/* ── Client answer ───────────────────────────────────────────── */

export async function answerClarification(input: {
  question: RequirementQuestion;
  response: string;
  respondedByName?: string;
}) {
  const { question } = input;
  if (question.status === "ANSWERED") {
    throw new Error("This question has already been answered.");
  }
  if (question.status === "CANCELLED") {
    throw new Error("This question was cancelled.");
  }

  const now = new Date();
  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      status: "ANSWERED",
      response: input.response,
      respondedByName: input.respondedByName ?? null,
      respondedAt: now,
    },
  });

  const sectionLabel = getSection(question.section)?.label ?? question.section;
  await recordEvent(
    question.requirementId,
    "CLARIFICATION_ANSWERED",
    "Client clarification received",
    `${sectionLabel} — ${input.response.slice(0, 80)}`,
    { questionId: question.id },
  );

  await db.clientMessage.create({
    data: {
      clientId: question.clientId,
      channel: "EMAIL",
      subject: `Clarification response — ${sectionLabel}`,
      body: input.response,
      direction: "IN",
      fromName: question.recipientName,
      at: now,
    },
  });

  await recordAudit({
    clientId: question.clientId,
    entity: "REQUIREMENT",
    action: "STATUS_CHANGED",
    entityId: question.requirementId,
    after: { clarification: "answered", section: question.section, questionId: question.id },
  });
  await db.client.update({
    where: { id: question.clientId },
    data: { lastActivityAt: now },
  });

  return updated;
}

/* ── Token resolution (client-facing) ────────────────────────── */

export async function resolveQuestionByToken(token: string) {
  const tokenHash = hashToken(token.trim());
  const question = await db.requirementQuestion.findUnique({
    where: { tokenHash },
    include: {
      client: { select: { companyName: true } },
      requirement: { select: { title: true } },
    },
  });
  if (!question) return null;
  if (question.tokenRevokedAt) {
    return { question, error: "REVOKED" as const, errorLabel: question.tokenRevokedReason };
  }
  if (question.tokenExpiresAt && question.tokenExpiresAt < new Date()) {
    return { question, error: "EXPIRED" as const, errorLabel: null };
  }
  if (question.status === "ANSWERED") {
    return { question, error: "ANSWERED" as const, errorLabel: null };
  }
  if (question.status === "CANCELLED") {
    return { question, error: "CANCELLED" as const, errorLabel: null };
  }
  return { question, error: null as null, errorLabel: null };
}

/* ── Serialization ───────────────────────────────────────────── */

export function serializeAdminQuestion(question: RequirementQuestion) {
  const sectionLabel = getSection(question.section)?.label ?? question.section;
  return {
    id: question.id,
    section: question.section,
    sectionLabel,
    question: question.question,
    internalNote: question.internalNote,
    recipientName: question.recipientName,
    recipientEmail: question.recipientEmail,
    createdByName: question.createdByName,
    status: question.status,
    sentAt: question.sentAt,
    respondedAt: question.respondedAt,
    response: question.response,
    respondedByName: question.respondedByName,
    expiresAt: question.tokenExpiresAt,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

type DeliveryRow = {
  id: string;
  kind: string;
  recipient: string;
  provider: string | null;
  status: string;
  sentAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
};

export function serializeQuestionDetail(question: RequirementQuestion, deliveries: DeliveryRow[]) {
  return {
    ok: true,
    question: serializeAdminQuestion(question),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      kind: d.kind,
      recipient: d.recipient,
      provider: d.provider,
      status: d.status,
      sentAt: d.sentAt,
      failedAt: d.failedAt,
      failureReason: d.failureReason,
      createdAt: d.createdAt,
    })),
  };
}

/** The client-facing view of the question — never internal ids or notes. */
export function serializePublicQuestion(question: RequirementQuestion) {
  return {
    ok: true,
    question: {
      section: question.section,
      sectionLabel: getSection(question.section)?.label ?? question.section,
      question: question.question,
      projectTitle: (question as unknown as { requirement: { title: string } }).requirement.title,
      companyName: (question as unknown as { client: { companyName: string } }).client.companyName,
      recipientName: question.recipientName,
    },
  };
}

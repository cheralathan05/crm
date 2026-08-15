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
import {
  classifyScope,
  suggestAnswerType,
  optionsFor,
  buildClientQuestion,
  scoreQuality,
  estimateImpact,
  estimatePriority,
  isVague,
  categoryLabel,
  type ImpactMap,
} from "./clarification-rules";
import { aiGenerateClarification } from "./clarification-ai";
import type {
  Client,
  QuestionStatus,
  RequirementQuestion,
  RequirementRequest,
} from "@/generated/prisma/client";

/* ────────────────────────────────────────────────────────────────
   ASK THE CLIENT — CLARIFICATION ENGINE
   One question is bound to exactly one workspace + client +
   requirement + section + (optionally) requirement item. Every
   question carries scope classification, a professional client-facing
   version, an answer type, options, priority, impact and a quality
   score. A vague internal note NEVER reaches the client — it becomes
   a structured draft that an admin must approve before sending.
──────────────────────────────────────────────────────────────── */

const TOKEN_VALID_HOURS = 24 * 14; // 14 days
export const QUALITY_GATE = 70;

/** Every status where the question is still "in flight" (guards duplicates). */
export const ACTIVE_QUESTION_STATUSES: QuestionStatus[] = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "READY_TO_SEND",
  "SENDING",
  "SENT",
  "DELIVERED",
  "OPENED",
];

/** Statuses where the client's answer is genuinely awaited. */
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
   One in-flight question per requirement + section. Prevents
   duplicate drafts, questions and emails from double clicks. */

export async function findOpenClarification(requestId: string, section: string) {
  return db.requirementQuestion.findFirst({
    where: { requirementId: requestId, section, status: { in: ACTIVE_QUESTION_STATUSES } },
    orderBy: { createdAt: "desc" },
  });
}

/* ── Draft generation — classification + professional rewrite ──
   AI first (grounded), deterministic rules as the always-available
   fallback. The raw admin note stays internal. */

async function loadClassificationContext(requirementId: string) {
  const [answers, features] = await Promise.all([
    (async () => {
      const rows = await db.requirementAnswer.findMany({ where: { requestId: requirementId } });
      const map: Record<string, Record<string, unknown>> = {};
      for (const r of rows) {
        try {
          map[r.section] = JSON.parse(r.data);
        } catch {
          map[r.section] = {};
        }
      }
      return map;
    })(),
    db.requirementFeature.findMany({
      where: { requestId: requirementId },
      select: { id: true, name: true, description: true, priority: true },
      orderBy: { order: "asc" },
    }),
  ]);
  return { answers, features };
}

export async function generateClarificationDraft(input: {
  question: RequirementQuestion;
  actorId?: string;
  actorName?: string;
}) {
  const { question } = input;
  const [request, context] = await Promise.all([
    db.requirementRequest.findUnique({ where: { id: question.requirementId } }),
    loadClassificationContext(question.requirementId),
  ]);
  if (!request) throw new Error("Requirement not found.");

  const note = question.question;
  const rules = classifyScope({
    text: note,
    section: question.section,
    features: context.features.map((f) => ({ id: f.id, name: f.name })),
    answers: context.answers,
  });

  // AI draft (grounded) when available; otherwise fall straight to rules.
  let draft: Awaited<ReturnType<typeof aiGenerateClarification>> = null;
  if (process.env.OLLAMA_URL) {
    draft = await aiGenerateClarification({
      note,
      section: question.section,
      projectTitle: request.title,
      projectType: request.projectType,
      features: context.features.map((f) => ({ name: f.name, description: f.description })),
      answers: context.answers,
    });
  }

  const category = draft?.category ?? rules.category;
  const subcategory = draft?.subcategory ?? rules.subcategory;
  const featureId = draft ? rules.featureId : rules.featureId;
  const answerType = draft?.answerType ?? suggestAnswerType(note);
  const options = draft?.options?.length ? draft.options : optionsFor(category, subcategory, answerType);
  const priority = draft?.priority ?? estimatePriority({ category, subcategory, note });
  const impact = draft?.impact ?? estimateImpact(category, priority);
  const isBlocking = priority === "BLOCKING";

  const rewritten = draft
    ? {
        clientQuestion: draft.clientQuestion,
        currentUnderstanding: draft.currentUnderstanding,
        whyWeAsk: draft.whyWeAsk,
        helpText: draft.helpText ?? "",
      }
    : buildClientQuestion({
        note,
        section: question.section,
        category,
        subcategory,
        itemLabel: rules.itemLabel,
        answerType,
      });

  const quality = scoreQuality({
    clientQuestion: rewritten.clientQuestion,
    section: question.section,
    category,
    subcategory,
    answerType,
    options,
    whyWeAsk: rewritten.whyWeAsk,
    currentUnderstanding: rewritten.currentUnderstanding,
    impact,
  });

  const now = new Date();
  const history = safeJsonArrayObject(question.editHistory);
  history.push({
    at: now.toISOString(),
    by: input.actorName ?? "System",
    version: question.version + 1,
    reason: "generated",
    category,
    answerType,
  });

  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      category,
      subcategory,
      featureId: featureId ?? null,
      clientQuestion: rewritten.clientQuestion,
      currentUnderstanding: rewritten.currentUnderstanding || null,
      whyWeAsk: rewritten.whyWeAsk || null,
      helpText: rewritten.helpText || null,
      answerType,
      options: JSON.stringify(options),
      priority,
      isBlocking,
      impact: JSON.stringify(impact),
      qualityScore: quality.score,
      qualityFlags: JSON.stringify(quality.flags),
      version: question.version + 1,
      editHistory: JSON.stringify(history),
      generatedAt: now,
      generatedById: input.actorId ?? null,
      status: "READY_FOR_REVIEW",
    },
  });

  await recordEvent(
    question.requirementId,
    "CLARIFICATION_GENERATED",
    "Clarification draft generated",
    `${categoryLabel(category)} — ${rewritten.clientQuestion.slice(0, 70)}`,
    { questionId: question.id },
  );

  return { question: updated, quality, draft: draft !== null };
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
      // A rough note is never client-ready — generate the draft immediately.
      status: "DRAFT",
    },
  });

  const generated = await generateClarificationDraft({
    question: created,
    actorId: input.actorId,
    actorName: input.actorName,
  });

  return { existing: null, created: generated.question, token };
}

/* ── Admin edits — versioned ─────────────────────────────────── */

export async function updateClarificationFields(input: {
  question: RequirementQuestion;
  fields: Partial<{
    clientQuestion: string;
    category: string;
    subcategory: string;
    answerType: string;
    options: string[];
    priority: string;
    isBlocking: boolean;
    whyWeAsk: string;
    currentUnderstanding: string;
    helpText: string;
    impact: Partial<ImpactMap>;
    dependsOnQuestionId: string | null;
    dependsOnAnswer: string | null;
    featureId: string | null;
  }>;
  actorId: string;
  actorName: string;
}) {
  const { question, fields, actorId, actorName } = input;

  const clientQuestion = fields.clientQuestion?.trim() || question.clientQuestion || question.question;
  const category = fields.category ?? question.category;
  const subcategory = fields.subcategory ?? question.subcategory;
  const answerType = fields.answerType ?? question.answerType;
  const options = fields.options ?? safeJsonArray(question.options);
  const priority = (fields.priority ?? question.priority).toUpperCase();
  const isBlocking = fields.isBlocking ?? question.isBlocking;
  const impact = fields.impact ?? safeJsonObject(question.impact);
  const whyWeAsk = fields.whyWeAsk ?? question.whyWeAsk;
  const currentUnderstanding = fields.currentUnderstanding ?? question.currentUnderstanding;
  const helpText = fields.helpText ?? question.helpText;

  const quality = scoreQuality({
    clientQuestion,
    section: question.section,
    category,
    subcategory,
    answerType,
    options,
    whyWeAsk,
    currentUnderstanding,
    impact,
  });

  const now = new Date();
  const history = safeJsonArrayObject(question.editHistory);
  history.push({
    at: now.toISOString(),
    by: actorName,
    version: question.version + 1,
    reason: "admin_edited",
  });

  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      clientQuestion,
      category,
      subcategory,
      answerType,
      options: JSON.stringify(options),
      priority,
      isBlocking,
      impact: JSON.stringify(impact),
      whyWeAsk: whyWeAsk?.trim() ? whyWeAsk.trim() : null,
      currentUnderstanding: currentUnderstanding?.trim() ? currentUnderstanding.trim() : null,
      helpText: helpText?.trim() ? helpText.trim() : null,
      featureId: fields.featureId === undefined ? question.featureId : fields.featureId,
      dependsOnQuestionId: fields.dependsOnQuestionId === undefined ? question.dependsOnQuestionId : fields.dependsOnQuestionId,
      dependsOnAnswer: fields.dependsOnAnswer === undefined ? question.dependsOnAnswer : fields.dependsOnAnswer,
      qualityScore: quality.score,
      qualityFlags: JSON.stringify(quality.flags),
      version: question.version + 1,
      editHistory: JSON.stringify(history),
      // Any edit sends it back for review.
      status: question.status === "APPROVED" || question.status === "SENT" ? "READY_FOR_REVIEW" : question.status,
      approvedAt: null,
      approvedById: null,
    },
  });

  return { question: updated, quality };
}

/* ── Approve ─────────────────────────────────────────────────── */

export async function approveClarification(input: {
  question: RequirementQuestion;
  actorId: string;
  actorName: string;
}) {
  if (input.question.status === "CANCELLED") throw new Error("This question was cancelled.");
  const now = new Date();
  const updated = await db.requirementQuestion.update({
    where: { id: input.question.id },
    data: { status: "APPROVED", approvedAt: now, approvedById: input.actorId },
  });
  await recordEvent(
    input.question.requirementId,
    "CLARIFICATION_APPROVED",
    "Clarification approved",
    `${categoryLabel(input.question.category) ?? input.question.section} — approved by ${input.actorName}`,
    { questionId: input.question.id },
  );
  return updated;
}

/* ── Send (initial + reminders) ────────────────────────────────
   The quality gate + approval happen here: a vague question is never
   emailed, and approving happens implicitly when the admin sends. */

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

  // Quality gate — no vague or low-quality questions reach the client.
  const clientQuestion = question.clientQuestion || question.question;
  if (isVague(clientQuestion)) {
    throw new Error("This question is too vague to send to the client. Use the generated draft or rewrite it with specific detail.");
  }
  const quality = scoreQuality({
    clientQuestion,
    section: question.section,
    category: question.category,
    subcategory: question.subcategory,
    answerType: question.answerType,
    options: safeJsonArray(question.options),
    whyWeAsk: question.whyWeAsk,
    currentUnderstanding: question.currentUnderstanding,
    impact: safeJsonObject(question.impact),
  });
  if (quality.score < QUALITY_GATE) {
    throw new Error(
      `This question scores ${quality.score}/100 (minimum ${QUALITY_GATE}) — add classification, context and a specific question before sending.`,
    );
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

  // Sending is the admin's approval — approve if it hasn't been yet.
  if (!["APPROVED", "READY_TO_SEND", "FAILED"].includes(question.status)) {
    await approveClarification({ question, actorId: input.actorId ?? "", actorName: input.actorName ?? "Owner" });
  }

  const { token, tokenHash, expiresAt } = issueQuestionToken();
  const link = questionLink(token);

  const sectionLabel = getSection(question.section)?.label ?? question.section;
  const senderName = input.actorName ?? question.createdByName ?? workspace.companyName;
  const emailInput = {
    to: question.recipientEmail,
    clientName: client.companyName,
    projectTitle: request.title,
    sectionLabel,
    question: clientQuestion,
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
        `${sectionLabel} — ${clientQuestion.slice(0, 80)}`,
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
        body: clientQuestion,
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
  const [deliveries, updateProposals] = await Promise.all([
    db.questionDelivery.findMany({ where: { questionId }, orderBy: { createdAt: "asc" } }),
    db.requirementUpdateProposal.findMany({ where: { questionId }, orderBy: { createdAt: "asc" } }),
  ]);
  return { question, deliveries, updateProposals };
}

/* ── Client answer — structured, validated ───────────────────── */

function validateAnswer(question: RequirementQuestion, value: unknown, answerData?: unknown): string {
  const type = question.answerType;
  const options = safeJsonArray(question.options);
  const text = (value === null || value === undefined) ? "" : String(value).trim();

  if (["SINGLE_SELECT", "DROPDOWN"].includes(type)) {
    if (!text) throw new Error("Please select an option before continuing.");
    if (options.length > 0 && !options.includes(text)) {
      throw new Error("The selected option is not in the allowed list.");
    }
    return text;
  }
  if (type === "MULTI_SELECT") {
    const arr = Array.isArray(answerData) ? answerData.filter((x): x is string => typeof x === "string") : [];
    if (arr.length === 0) throw new Error("Please select at least one option.");
    if (options.length > 0 && arr.some((o) => !options.includes(o))) {
      throw new Error("One of the selected options is not in the allowed list.");
    }
    return arr.join(", ");
  }
  if (type === "YES_NO") {
    const yes = /^yes$/i.test(text);
    const no = /^no$/i.test(text);
    if (!yes && !no) throw new Error("Please answer Yes or No.");
    return yes ? "Yes" : "No";
  }
  if (type === "NUMBER") {
    if (!/^\d+([.,]\d+)?$/.test(text)) throw new Error("Please enter a number.");
    return text;
  }
  if (type === "CURRENCY") {
    if (!/^\d+([.,]\d+)?$/.test(text.replace(/[^0-9.,]/g, ""))) throw new Error("Please enter an amount.");
    return text;
  }
  if (type === "EMAIL") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error("Please enter a valid email address.");
    return text;
  }
  if (type === "URL") {
    if (!/^https?:\/\/\S+$/i.test(text)) throw new Error("Please enter a valid URL (starting with http:// or https://).");
    return text;
  }
  if (type === "PHONE") {
    if (!/^[+\d][\d\s\-()]{6,}$/.test(text)) throw new Error("Please enter a valid phone number.");
    return text;
  }
  if (type === "DATE") {
    if (!Number.isNaN(Date.parse(text))) return text;
    throw new Error("Please enter a valid date.");
  }
  if (type === "RATING") {
    const n = Number(text);
    if (!Number.isFinite(n) || n < 1 || n > 10) throw new Error("Please choose a rating.");
    return String(n);
  }
  if (!text) throw new Error("Please write your response before continuing.");
  return text;
}

export async function answerClarification(input: {
  question: RequirementQuestion;
  response: string;
  answerData?: unknown;
  respondedByName?: string;
}) {
  const { question } = input;
  if (question.status === "CANCELLED") {
    throw new Error("This question was cancelled.");
  }
  if (question.status === "RESOLVED") {
    throw new Error("This question has already been resolved.");
  }

  // Re-answers update the stored answer (client editing their progress).
  const response = validateAnswer(question, input.response, input.answerData);

  const now = new Date();
  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      status: "ANSWERED",
      response,
      answerData: input.answerData === undefined ? null : JSON.stringify(input.answerData),
      respondedByName: input.respondedByName ?? null,
      respondedAt: now,
    },
  });

  const sectionLabel = getSection(question.section)?.label ?? question.section;
  await recordEvent(
    question.requirementId,
    "CLARIFICATION_ANSWERED",
    "Client clarification received",
    `${sectionLabel} — ${response.slice(0, 80)}`,
    { questionId: question.id },
  );

  await db.clientMessage.create({
    data: {
      clientId: question.clientId,
      channel: "EMAIL",
      subject: `Clarification response — ${sectionLabel}`,
      body: response,
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

/* ── Admin review → resolve → update proposal ────────────────── */

export async function reviewClarificationAnswer(input: {
  question: RequirementQuestion;
  decision: "accept" | "reject";
  note?: string;
  actorId: string;
  actorName: string;
}) {
  const { question, decision } = input;
  if (question.status !== "ANSWERED" && question.status !== "UNDER_REVIEW") {
    throw new Error("This question has no answer to review.");
  }

  if (decision === "reject") {
    // Back to the review list so the admin can edit and re-ask.
    const updated = await db.requirementQuestion.update({
      where: { id: question.id },
      data: { status: "READY_FOR_REVIEW", reviewedAt: new Date() },
    });
    await recordEvent(
      question.requirementId,
      "CLARIFICATION_REVIEWED",
      "Clarification answer rejected",
      `${categoryLabel(question.category) ?? question.section} — ${input.note ?? "rejected"}`,
      { questionId: question.id },
    );
    return { question: updated, proposal: null as never };
  }

  return resolveClarification(input);
}

export async function resolveClarification(input: {
  question: RequirementQuestion;
  actorId: string;
  actorName: string;
  note?: string;
}) {
  const { question } = input;
  const now = new Date();

  const proposal = await db.requirementUpdateProposal.create({
    data: {
      workspaceId: question.workspaceId,
      clientId: question.clientId,
      requirementId: question.requirementId,
      questionId: question.id,
      summary: `${categoryLabel(question.category) || question.section} — ${(question.clientQuestion ?? question.question).slice(0, 120)}`,
      currentValue: "Not specified in requirement",
      proposedValue: question.response?.slice(0, 500) ?? "",
      impact: question.impact,
      createdById: input.actorId,
      createdByName: input.actorName,
      status: "PENDING",
    },
  });

  const updated = await db.requirementQuestion.update({
    where: { id: question.id },
    data: {
      status: "RESOLVED",
      reviewedAt: now,
      resolvedAt: now,
    },
  });

  // The doubt this answer resolves is now closed — also resolve any open
  // workspace comment threads for the same section so the requirement stops
  // asking the client about it.
  await db.requirementComment.updateMany({
    where: { requestId: question.requirementId, section: question.section, author: "ADMIN", resolvedAt: null },
    data: { resolvedAt: now },
  });

  await recordEvent(
    question.requirementId,
    "CLARIFICATION_RESOLVED",
    "Clarification resolved",
    `${categoryLabel(question.category) ?? question.section} — answer accepted`,
    { questionId: question.id, proposalId: proposal.id },
  );
  await recordEvent(
    question.requirementId,
    "UPDATE_PROPOSED",
    "Requirement update proposed",
    `From resolved clarification — ${question.section}`,
    { proposalId: proposal.id, questionId: question.id },
  );
  await recordAudit({
    clientId: question.clientId,
    entity: "REQUIREMENT",
    action: "STATUS_CHANGED",
    entityId: question.requirementId,
    actorId: input.actorId,
    actorName: input.actorName,
    after: { clarification: "resolved", questionId: question.id, proposalId: proposal.id },
  });

  return { question: updated, proposal };
}

export async function decideUpdateProposal(input: {
  proposalId: string;
  decision: "accept" | "reject";
  actorName: string;
}) {
  const proposal = await db.requirementUpdateProposal.findUnique({
    where: { id: input.proposalId },
    include: {
      question: {
        select: { id: true, section: true, question: true, clientQuestion: true, response: true, category: true },
      },
    },
  });
  if (!proposal) throw new Error("Proposal not found.");

  if (input.decision === "reject") {
    const updated = await db.requirementUpdateProposal.update({
      where: { id: proposal.id },
      data: { status: "REJECTED", decidedAt: new Date() },
    });
    await recordAudit({
      clientId: proposal.clientId,
      entity: "REQUIREMENT",
      action: "STATUS_CHANGED",
      entityId: proposal.requirementId,
      actorName: input.actorName,
      after: { updateProposal: "reject", proposalId: proposal.id },
    });
    return updated;
  }

  // Accept — the client's answer becomes part of a NEW requirement
  // version. Historical answers are never overwritten: the accepted
  // value is appended to the section's answers, the request revision
  // is bumped, and an immutable RequirementRevision is recorded.
  const now = new Date();
  const updated = await db.requirementUpdateProposal.update({
    where: { id: proposal.id },
    data: { status: "ACCEPTED", decidedAt: now },
  });

  const section = proposal.question?.section;
  let sectionData: Record<string, unknown> = {};
  if (section) {
    const existing = await db.requirementAnswer.findUnique({
      where: { requestId_section: { requestId: proposal.requirementId, section } },
    });
    if (existing?.data) {
      try {
        sectionData = JSON.parse(existing.data);
      } catch {
        sectionData = {};
      }
    }
    const clarifications = Array.isArray(sectionData.clarifications) ? (sectionData.clarifications as unknown[]) : [];
    clarifications.push({
      questionId: proposal.questionId,
      question: proposal.question?.clientQuestion ?? proposal.question?.question ?? proposal.summary,
      answer: proposal.proposedValue,
      acceptedAt: now.toISOString(),
      by: input.actorName,
    });
    const data = JSON.stringify({ ...sectionData, clarifications });
    await db.requirementAnswer.upsert({
      where: { requestId_section: { requestId: proposal.requirementId, section } },
      create: { requestId: proposal.requirementId, section, data },
      update: { data },
    });
  }

  const request = await db.requirementRequest.findUnique({ where: { id: proposal.requirementId } });
  if (request) {
    const nextRevision = request.revision + 1;
    const label = section ? getSection(section)?.label ?? section : "Requirement";
    const changeText =
      `${label} — ${(proposal.question?.clientQuestion ?? proposal.question?.question ?? proposal.summary).slice(0, 120)}: ` +
      `${(proposal.proposedValue ?? "").slice(0, 200)}`;
    await db.requirementRevision.create({
      data: {
        requestId: proposal.requirementId,
        revision: nextRevision,
        submittedByName: input.actorName,
        snapshot: JSON.stringify({
          answers: section ? { [section]: sectionData } : {},
          features: [],
          files: [],
        }),
        changes: JSON.stringify(["Clarification applied", changeText]),
      },
    });
    await db.requirementRequest.update({
      where: { id: proposal.requirementId },
      data: { revision: nextRevision },
    });
    await recordEvent(
      proposal.requirementId,
      "UPDATE_APPLIED",
      "Clarification applied to requirement",
      `${label} — v${nextRevision}`,
      { proposalId: proposal.id, questionId: proposal.questionId, revision: nextRevision },
    );
  }

  await recordAudit({
    clientId: proposal.clientId,
    entity: "REQUIREMENT",
    action: "STATUS_CHANGED",
    entityId: proposal.requirementId,
    actorName: input.actorName,
    after: { updateProposal: "accept", proposalId: proposal.id, applied: true },
  });
  return updated;
}

/* ── Conflicts (dependency-aware) ────────────────────────────── */

export async function detectAnswerConflicts(requirementId: string) {
  const questions = await db.requirementQuestion.findMany({
    where: { requirementId, status: { in: ["ANSWERED", "UNDER_REVIEW", "RESOLVED"] } },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const conflicts: { questionId: string; description: string; detail: string }[] = [];

  for (const q of questions) {
    if (!q.dependsOnQuestionId || !q.dependsOnAnswer) continue;
    const parent = byId.get(q.dependsOnQuestionId);
    if (!parent) continue;
    const parentAnswer = parent.response ?? "";
    const expected = q.dependsOnAnswer;
    const met = expected === "*" ? Boolean(parentAnswer) : parentAnswer.toLowerCase().includes(expected.toLowerCase());
    if (!met) {
      conflicts.push({
        questionId: q.id,
        description: "Possible requirement conflict",
        detail: `This question was only relevant when the previous answer was “${expected}”, but it is now “${parentAnswer || "unanswered"}”. Please adjust one of the answers.`,
      });
    }
  }
  return conflicts;
}

/* ── Proposal blocker ────────────────────────────────────────── */

export async function proposalBlockForRequirement(requirementId: string) {
  const questions = await db.requirementQuestion.findMany({
    where: { requirementId, isBlocking: true },
    select: { id: true, status: true, category: true, subcategory: true, clientQuestion: true },
  });
  const blockers = questions
    .filter((q) => !["RESOLVED", "CANCELLED", "BLOCKED"].includes(q.status))
    .map((q) => ({
      id: q.id,
      label: q.clientQuestion ?? "Unresolved blocking question",
      category: categoryLabel(q.category) || q.subcategory || "Unclassified",
    }));
  return { blocked: blockers.length > 0, blockers };
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
  if (question.status === "CANCELLED") {
    return { question, error: "CANCELLED" as const, errorLabel: null };
  }
  if (question.status === "RESOLVED") {
    return { question, error: "RESOLVED" as const, errorLabel: null };
  }
  return { question, error: null as null, errorLabel: null };
}

/** Resolve the whole clarification bundle a token authorizes the client to answer. */
export async function resolveClarificationBundleByToken(token: string) {
  const single = await resolveQuestionByToken(token);
  if (!single) return null;
  if (single.error) {
    return { error: single.error, errorLabel: single.errorLabel };
  }
  const { question } = single;

  const questions = await db.requirementQuestion.findMany({
    where: {
      requirementId: question.requirementId,
      status: { in: ["SENT", "DELIVERED", "OPENED", "ANSWERED", "UNDER_REVIEW"] },
    },
    orderBy: { createdAt: "asc" },
    // The bundle serializer reads the project + client identity from
    // every question — include them so /client/clarifications never 500s.
    include: {
      client: { select: { companyName: true } },
      requirement: { select: { title: true } },
    },
  });
  if (questions.length === 0) {
    return { error: "CLOSED" as const, errorLabel: null };
  }
  return { error: null as null, errorLabel: null, questions, anchorId: question.id };
}

/* ── Serialization ───────────────────────────────────────────── */

function safeJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function safeJsonArrayObject(json: string): Record<string, unknown>[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object") : [];
  } catch {
    return [];
  }
}
function safeJsonObject(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function serializeAdminQuestion(question: RequirementQuestion) {
  const sectionLabel = getSection(question.section)?.label ?? question.section;
  return {
    id: question.id,
    section: question.section,
    sectionLabel,
    category: question.category,
    categoryLabel: categoryLabel(question.category),
    subcategory: question.subcategory,
    featureId: question.featureId,
    question: question.question,
    clientQuestion: question.clientQuestion ?? question.question,
    internalNote: question.internalNote,
    currentUnderstanding: question.currentUnderstanding,
    whyWeAsk: question.whyWeAsk,
    helpText: question.helpText,
    answerType: question.answerType,
    options: safeJsonArray(question.options),
    priority: question.priority,
    isBlocking: question.isBlocking,
    impact: safeJsonObject(question.impact),
    qualityScore: question.qualityScore,
    qualityFlags: safeJsonArray(question.qualityFlags),
    version: question.version,
    dependsOnQuestionId: question.dependsOnQuestionId,
    dependsOnAnswer: question.dependsOnAnswer,
    generatedAt: question.generatedAt,
    approvedAt: question.approvedAt,
    reviewedAt: question.reviewedAt,
    resolvedAt: question.resolvedAt,
    recipientName: question.recipientName,
    recipientEmail: question.recipientEmail,
    createdByName: question.createdByName,
    status: question.status,
    sentAt: question.sentAt,
    respondedAt: question.respondedAt,
    response: question.response,
    answerData: question.answerData ? safeJsonObject(question.answerData) : null,
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

export function serializeQuestionDetail(question: RequirementQuestion, deliveries: DeliveryRow[], updateProposals: unknown[] = []) {
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
    updateProposals: updateProposals.map((p) => ({
      id: (p as { id: string }).id,
      summary: (p as { summary: string }).summary,
      currentValue: (p as { currentValue: string | null }).currentValue,
      proposedValue: (p as { proposedValue: string | null }).proposedValue,
      status: (p as { status: string }).status,
      createdAt: (p as { createdAt: Date }).createdAt,
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
      question: question.clientQuestion ?? question.question,
      projectTitle: (question as unknown as { requirement: { title: string } }).requirement.title,
      companyName: (question as unknown as { client: { companyName: string } }).client.companyName,
      recipientName: question.recipientName,
    },
  };
}

/** Full client bundle — grouped, classified, dependency-aware. */
export function serializePublicClarificationBundle(input: {
  anchor: RequirementQuestion;
  questions: RequirementQuestion[];
}) {
  const { anchor, questions } = input;
  const companyName = (anchor as unknown as { client: { companyName: string } }).client.companyName;
  const projectTitle = (anchor as unknown as { requirement: { title: string } }).requirement.title;

  const visible = questions.filter((q) => {
    if (!q.dependsOnQuestionId) return true;
    const parent = questions.find((p) => p.id === q.dependsOnQuestionId);
    if (!parent) return true;
    const expected = q.dependsOnAnswer ?? "*";
    const parentAnswer = parent.response ?? "";
    return expected === "*" ? Boolean(parentAnswer) : parentAnswer.toLowerCase().includes(expected.toLowerCase());
  });

  const answeredCount = visible.filter((q) => q.status === "ANSWERED" || q.status === "UNDER_REVIEW").length;

  return {
    ok: true,
    companyName,
    projectTitle,
    anchorId: anchor.id,
    recipientName: anchor.recipientName,
    progress: { answered: answeredCount, total: visible.length },
    questions: visible.map((q) => ({
      id: q.id,
      section: q.section,
      sectionLabel: getSection(q.section)?.label ?? q.section,
      category: q.category,
      categoryLabel: categoryLabel(q.category),
      subcategory: q.subcategory,
      featureName: (q as unknown as { feature?: { name: string } | null }).feature?.name ?? null,
      clientQuestion: q.clientQuestion ?? q.question,
      currentUnderstanding: q.currentUnderstanding,
      whyWeAsk: q.whyWeAsk,
      helpText: q.helpText,
      answerType: q.answerType,
      options: safeJsonArray(q.options),
      priority: q.priority,
      isBlocking: q.isBlocking,
      impact: safeJsonObject(q.impact),
      required: q.isBlocking,
      status: q.status,
      response: q.response,
      answerData: q.answerData ? safeJsonObject(q.answerData) : null,
      dependsOnQuestionId: q.dependsOnQuestionId,
      dependsOnAnswer: q.dependsOnAnswer,
    })),
  };
}

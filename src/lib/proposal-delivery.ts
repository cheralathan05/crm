import { db } from "./db";
import { generateToken, hashToken, tokenExpiry } from "./tokens";
import { readStored } from "./uploads";
import { recordAudit } from "./clients";
import { recordEvent } from "./requirements";
import { amountLabel } from "./proposal-doc";
import {
  sendProposalEmail,
  sendProposalApprovalConfirmationEmail,
  sendProposalChangeRequestReceivedEmail,
  sendProposalChangeRequestDecisionEmail,
  sendProposalRejectedAckEmail,
  emailConfigStatus,
  type MailResult,
} from "./mail";
import type { ClientProposal } from "@/generated/prisma/client";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL DELIVERY SYSTEM — DOMAIN LOGIC
   The finalized proposal becomes a real business document that can
   be explicitly sent to the client, opened, viewed as PDF, approved,
   or challenged with a structured change request. Every transition
   is persisted, audited and reflected in the client + requirement
   timelines. Nothing is simulated: email state, view state, approval
   and rejection all come from real stored records.
──────────────────────────────────────────────────────────────── */

const TOKEN_VALID_HOURS = 24 * 90; // 90 days

export function proposalClientLink(token: string): string {
  return `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/client-proposal/${token}`;
}

function issueProposalToken() {
  const token = generateToken(32);
  return { token, tokenHash: hashToken(token), expiresAt: tokenExpiry(TOKEN_VALID_HOURS) };
}

/** Proposal statuses the client may still act on. */
export const ACTIVE_PROPOSAL_STATUSES = [
  "SENT",
  "DELIVERED",
  "RESENT",
  "VIEWED",
  "CHANGES_REQUESTED",
  "REVISION_IN_PROGRESS",
  "REVISION_READY",
];

export function proposalNextAction(proposal: Pick<ClientProposal, "status">): { title: string; detail: string } {
  switch (proposal.status) {
    case "DRAFT":
      return { title: "Finalize the proposal", detail: "Generate the PDF before it can be sent to the client." };
    case "FINALIZED":
      return { title: "Send to client", detail: "The PDF is ready — send it explicitly when you are satisfied." };
    case "REVISION_IN_PROGRESS":
      return { title: "Complete the revision", detail: "Apply the accepted changes and finalize the revised PDF." };
    case "REVISION_READY":
      return { title: "Send revised proposal", detail: "The revised PDF is ready — send it to the client." };
    case "SENT":
    case "DELIVERED":
    case "RESENT":
      return { title: "Await client review", detail: "The proposal was sent — waiting for the client to open it." };
    case "VIEWED":
      return { title: "Await client decision", detail: "The client opened the proposal — waiting for approval or changes." };
    case "CHANGES_REQUESTED":
      return { title: "Review requested changes", detail: "The client asked for changes — review and decide on each one." };
    case "APPROVED":
      return { title: "Create project", detail: "The client approved the proposal — start the project." };
    case "REJECTED":
      return { title: "Proposal declined", detail: "The client chose not to proceed with this proposal." };
    case "EXPIRED":
      return { title: "Proposal expired", detail: "The secure link has expired — regenerate access to continue." };
    default:
      return { title: "Continue the proposal", detail: "Keep working on this proposal." };
  }
}

/* ── Token resolution (client-facing) ────────────────────────── */

export async function resolveProposalByToken(token: string) {
  const tokenHash = hashToken(token.trim());
  const proposal = await db.clientProposal.findUnique({
    where: { tokenHash },
    include: {
      client: { select: { id: true, companyName: true, email: true, workspaceId: true } },
    },
  });
  if (!proposal) return null;
  if (proposal.tokenRevokedAt) {
    return { proposal, error: "REVOKED" as const, errorLabel: proposal.tokenRevokedReason };
  }
  if (proposal.tokenExpiresAt && proposal.tokenExpiresAt < new Date()) {
    return { proposal, error: "EXPIRED" as const, errorLabel: null };
  }
  if (proposal.status === "REJECTED") {
    return { proposal, error: "REJECTED" as const, errorLabel: null };
  }
  return { proposal, error: null as null, errorLabel: null };
}

/* ── Recipient resolution ───────────────────────────────────────
   Never trust a frontend address. The recipient is the last address
   we sent to, otherwise the client's primary contact, otherwise the
   client's own email. */

async function resolveProposalRecipient(proposal: ClientProposal) {
  if (proposal.sentTo?.trim()) {
    return { contactId: proposal.clientId, name: proposal.sentToName ?? "Client", email: proposal.sentTo.trim() };
  }
  const client = await db.client.findUnique({ where: { id: proposal.clientId } });
  if (!client) throw new Error("Client not found.");
  const primary = await db.contact.findFirst({
    where: { clientId: proposal.clientId, isPrimary: true, email: { not: null } },
  });
  if (primary?.email?.trim()) {
    return { contactId: primary.id, name: primary.name, email: primary.email.trim() };
  }
  const anyContact = await db.contact.findFirst({
    where: { clientId: proposal.clientId, email: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (anyContact?.email?.trim()) {
    return { contactId: anyContact.id, name: anyContact.name, email: anyContact.email.trim() };
  }
  if (client.email?.trim()) {
    return { contactId: null, name: client.companyName, email: client.email.trim() };
  }
  throw new Error("No client email is on file — add a contact email before sending the proposal.");
}

/* ── Send — the admin's explicit, validated delivery ─────────── */

export type ProposalSendResult = {
  sent: boolean;
  dev: boolean;
  link: string;
  message: string;
};

export async function sendProposalToClient(input: {
  proposal: ClientProposal;
  kind?: "INITIAL" | "REVISION" | "RESEND";
  actorId: string;
  actorName: string;
  recipientEmail?: string;
  recipientName?: string;
}): Promise<ProposalSendResult> {
  const { proposal, kind = "INITIAL" } = input;

  // Validations — never send a broken proposal.
  if (proposal.status === "APPROVED" && kind !== "RESEND") throw new Error("This proposal has already been approved.");
  if (proposal.status === "REJECTED") throw new Error("This proposal was declined by the client and can no longer be sent.");
  if (!proposal.finalizedAt || !proposal.pdfPath) {
    throw new Error("Finalize the proposal and generate the PDF before sending it to the client.");
  }
  const stored = await readStored(proposal.pdfPath);
  if (!stored) {
    throw new Error("The finalized PDF file is missing. Finalize the proposal again to regenerate it.");
  }

  const [client, request] = await Promise.all([
    db.client.findUnique({ where: { id: proposal.clientId } }),
    proposal.requirementRequestId ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } }) : null,
  ]);
  if (!client) throw new Error("Client not found.");

  const resolvedWorkspace = await db.workspace.findUnique({ where: { id: client.workspaceId }, include: { profile: true } });
  if (!resolvedWorkspace) throw new Error("Workspace not found.");

  let recipient: { contactId: string | null; name: string; email: string };
  if (input.recipientEmail?.trim()) {
    recipient = {
      contactId: null,
      name: input.recipientName?.trim() || client.companyName || "Client",
      email: input.recipientEmail.trim(),
    };
    if (!client.email) {
      await db.client.update({ where: { id: client.id }, data: { email: input.recipientEmail.trim() } });
    }
  } else {
    recipient = await resolveProposalRecipient(proposal);
  }

  // Every send issues a fresh secure token — the raw token is only ever
  // handed to the email path, the database stores only its hash.
  const { token, tokenHash, expiresAt } = issueProposalToken();
  const link = proposalClientLink(token);

  const document = safeJsonObject(proposal.document);
  const meta = (document as { meta?: Record<string, unknown> }).meta ?? {};
  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  const mail: MailResult = await sendProposalEmail({
    to: recipient.email,
    clientName: recipient.name,
    projectTitle: proposal.title,
    proposalReference: proposal.reference ?? "PROP",
    companyName: resolvedWorkspace.companyName,
    timelineLabel: typeof meta.timelineLabel === "string" ? meta.timelineLabel : "",
    amountLabel: typeof meta.amountLabel === "string" ? meta.amountLabel : amountLabel(proposal.amount),
    link,
    senderName: input.actorName ?? resolvedWorkspace.companyName,
    pdf: {
      filename: `${resolvedWorkspace.companyName.replace(/[^A-Za-z0-9-]/g, "")}-${safeName}-v${proposal.version}.pdf`,
      buffer: stored.buffer,
    },
    version: proposal.version,
    revision: kind === "REVISION",
  });

  const channel = emailConfigStatus().channel;
  const now = new Date();

  if (mail.sent || mail.devUrl) {
    await db.proposalDelivery.create({
      data: {
        proposalId: proposal.id,
        workspaceId: client.workspaceId,
        clientId: client.id,
        proposalVersion: proposal.version,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        kind,
        status: "SENT",
        provider: channel === "none" ? null : channel,
        sentAt: now,
      },
    });

    const wasSentBefore = Boolean(proposal.sentAt);
    const saved = await db.clientProposal.update({
      where: { id: proposal.id },
      data: {
        status: wasSentBefore ? "RESENT" : "SENT",
        sentAt: proposal.sentAt ?? now,
        sentTo: recipient.email,
        sentToName: recipient.name,
        tokenHash,
        tokenExpiresAt: expiresAt,
        tokenRevokedAt: null,
        tokenRevokedReason: null,
      },
    });

    // Keep the frozen version snapshot in sync.
    const versionRow = await db.proposalVersion.findUnique({
      where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
    });
    if (versionRow) {
      await db.proposalVersion.update({
        where: { id: versionRow.id },
        data: { status: wasSentBefore ? "RESENT" : "SENT", sentAt: proposal.sentAt ?? now },
      });
    }

    await db.clientMessage.create({
      data: {
        clientId: client.id,
        channel: "EMAIL",
        subject: `Proposal for ${proposal.title} — ${resolvedWorkspace.companyName}`,
        body: `Proposal ${proposal.reference ?? ""} (v${proposal.version}) sent to ${recipient.email}`,
        direction: "OUT",
        fromName: input.actorName,
        at: now,
      },
    });
    await recordAudit({
      clientId: client.id,
      entity: "PROPOSAL",
      action: wasSentBefore ? "STATUS_CHANGED" : "PROPOSAL_SENT",
      entityId: proposal.id,
      actorId: input.actorId,
      actorName: input.actorName,
      after: { status: saved.status, version: proposal.version, recipient: recipient.email, kind },
    });
    await db.client.update({ where: { id: client.id }, data: { lastActivityAt: now } });

    if (request) {
      await recordEvent(
        request.id,
        "PROPOSAL_SENT",
        "Proposal sent to client",
        `${proposal.reference ?? "PROP"} v${proposal.version} — sent to ${recipient.email}`,
        { proposalId: proposal.id, version: proposal.version },
      );
    }

    if (!mail.sent) {
      return { sent: false, dev: true, link, message: "Email provider not configured — the proposal link was printed to the server console." };
    }
    return { sent: true, dev: false, link, message: "" };
  }

  // Real delivery failure — never claim sent.
  await db.proposalDelivery.create({
    data: {
      proposalId: proposal.id,
      workspaceId: client.workspaceId,
      clientId: client.id,
      proposalVersion: proposal.version,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      kind,
      status: "FAILED",
      provider: channel === "none" ? null : channel,
      failedAt: now,
      failureReason: "Delivery failed — check the server log for a safe diagnostic.",
    },
  });
  return {
    sent: false,
    dev: false,
    link,
    message: "The proposal email could not be delivered. Check the email configuration and retry — the proposal itself is unchanged.",
  };
}

/* ── View tracking — SENT → VIEWED only on a real open ───────── */

export async function recordProposalOpen(token: string, sessionId?: string) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved) throw new Error("Proposal not found.");
  if (resolved.error === "REVOKED") throw new Error("This proposal link is no longer active.");
  if (resolved.error === "EXPIRED") throw new Error("This proposal link has expired.");
  const { proposal } = resolved;

  const now = new Date();
  const firstOpen = proposal.viewCount === 0;

  // Upsert the view session — one row per browser session.
  if (sessionId) {
    const existing = await db.proposalView.findFirst({
      where: { proposalId: proposal.id, sessionId },
    });
    if (existing) {
      await db.proposalView.update({
        where: { id: existing.id },
        data: { lastViewedAt: now, viewCount: { increment: 1 } },
      });
    } else {
      await db.proposalView.create({
        data: {
          proposalId: proposal.id,
          workspaceId: proposal.client.workspaceId,
          clientId: proposal.clientId,
          sessionId,
        },
      });
    }
  }

  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: {
      ...(proposal.status === "SENT" || proposal.status === "DELIVERED" || proposal.status === "RESENT"
        ? { status: "VIEWED" }
        : {}),
      viewedAt: proposal.viewedAt ?? now,
      firstViewedAt: proposal.firstViewedAt ?? now,
      lastViewedAt: now,
      viewCount: { increment: 1 },
    },
  });

  const versionRow = await db.proposalVersion.findUnique({
    where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
  });
  if (versionRow) {
    await db.proposalVersion.update({ where: { id: versionRow.id }, data: { status: "VIEWED" } });
  }

  if (firstOpen && proposal.requirementRequestId) {
    await recordEvent(
      proposal.requirementRequestId,
      "PROPOSAL_VIEWED",
      "Client opened proposal",
      `${proposal.reference ?? "PROP"} v${proposal.version}`,
      { proposalId: proposal.id, version: proposal.version },
    );
  }
  await db.client.update({ where: { id: proposal.clientId }, data: { lastActivityAt: now } });
  return saved;
}

export async function recordProposalPdfOpen(token: string, sessionId?: string) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved || resolved.error) throw new Error("Proposal not found.");
  const { proposal } = resolved;
  const now = new Date();

  if (sessionId) {
    const view = await db.proposalView.findFirst({ where: { proposalId: proposal.id, sessionId } });
    if (view) {
      await db.proposalView.update({ where: { id: view.id }, data: { pdfOpened: true, pdfViewedAt: now } });
    }
  }
  return { ok: true };
}

/* ── Client decision — APPROVE ───────────────────────────────── */

export async function approveProposal(token: string, input: { clientName?: string }) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved) throw new Error("Proposal not found.");
  if (resolved.error === "REVOKED") throw new Error("This proposal link is no longer active.");
  if (resolved.error === "EXPIRED") throw new Error("This proposal link has expired.");
  if (resolved.error === "REJECTED") throw new Error("This proposal was declined.");
  const { proposal } = resolved;

  // Idempotent — never create a duplicate approval.
  const existing = await db.proposalApproval.findFirst({
    where: { proposalId: proposal.id, proposalVersion: proposal.version },
    orderBy: { approvedAt: "desc" },
  });
  if (existing) {
    return { approval: existing, proposal, alreadyApproved: true };
  }

  const now = new Date();
  const approval = await db.proposalApproval.create({
    data: {
      proposalId: proposal.id,
      workspaceId: proposal.client.workspaceId,
      clientId: proposal.clientId,
      proposalVersion: proposal.version,
      approvalMethod: "SECURE_LINK",
      clientName: input.clientName ?? proposal.client.companyName,
    },
  });

  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: { status: "APPROVED" },
  });

  const versionRow = await db.proposalVersion.findUnique({
    where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
  });
  if (versionRow) {
    await db.proposalVersion.update({ where: { id: versionRow.id }, data: { status: "APPROVED", approvedAt: now } });
  }

  const [workspace, request] = await Promise.all([
    db.workspace.findUnique({ where: { id: proposal.client.workspaceId } }),
    proposal.requirementRequestId ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } }) : null,
  ]);

  await db.clientMessage.create({
    data: {
      clientId: proposal.clientId,
      channel: "EMAIL",
      subject: `Proposal approved — ${proposal.title}`,
      body: `Client approved proposal ${proposal.reference ?? ""} v${proposal.version}.`,
      direction: "IN",
      fromName: input.clientName ?? proposal.client.companyName,
      at: now,
    },
  });
  await recordAudit({
    clientId: proposal.clientId,
    entity: "PROPOSAL",
    action: "PROPOSAL_APPROVED",
    entityId: proposal.id,
    after: { status: "APPROVED", version: proposal.version, approvalId: approval.id },
  });
  await db.client.update({ where: { id: proposal.clientId }, data: { lastActivityAt: now } });

  if (request) {
    await recordEvent(
      request.id,
      "PROPOSAL_APPROVED",
      "Client approved proposal",
      `${proposal.reference ?? "PROP"} v${proposal.version}`,
      { proposalId: proposal.id, version: proposal.version, approvalId: approval.id },
    );
  }

  // Client confirmation email — best effort, never blocks the approval.
  if (workspace && proposal.client.email) {
    await sendProposalApprovalConfirmationEmail({
      to: proposal.client.email,
      clientName: proposal.client.companyName,
      projectTitle: proposal.title,
      proposalReference: proposal.reference ?? "PROP",
      companyName: workspace.companyName,
      version: proposal.version,
    }).catch(() => undefined);
  }

  return { approval, proposal: saved, alreadyApproved: false };
}

/* ── Client decision — REQUEST CHANGES (structured) ──────────── */

export type ClientChangeItem = {
  section: string;
  field?: string;
  currentValue?: string;
  requestedValue?: string;
  reason?: string;
};

export async function requestProposalChanges(
  token: string,
  input: {
    reasons: string[];
    sections: string[];
    changes: ClientChangeItem[];
    message: string;
    priority: string;
    clientName?: string;
  },
) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved) throw new Error("Proposal not found.");
  if (resolved.error === "REVOKED") throw new Error("This proposal link is no longer active.");
  if (resolved.error === "EXPIRED") throw new Error("This proposal link has expired.");
  if (resolved.error === "REJECTED") throw new Error("This proposal was declined.");
  const { proposal } = resolved;

  const message = input.message.trim();
  if (!message) throw new Error("Describe the changes you'd like before submitting.");

  const now = new Date();
  const count = await db.proposalChangeRequest.count({ where: { workspaceId: proposal.client.workspaceId } });
  const reference = `CR-${String(count + 1).padStart(4, "0")}`;

  const created = await db.proposalChangeRequest.create({
    data: {
      proposalId: proposal.id,
      workspaceId: proposal.client.workspaceId,
      clientId: proposal.clientId,
      proposalVersion: proposal.version,
      reference,
      reasons: JSON.stringify(input.reasons.filter(Boolean).slice(0, 20)),
      sections: JSON.stringify(input.sections.filter(Boolean).slice(0, 20)),
      message,
      priority: ["LOW", "MEDIUM", "HIGH", "BLOCKING"].includes(input.priority) ? input.priority : "MEDIUM",
      status: "SUBMITTED",
      submittedByName: input.clientName ?? proposal.client.companyName,
      items: {
        create: input.changes
          .filter((c) => c.section || c.requestedValue)
          .slice(0, 30)
          .map((c) => ({
            section: c.section || "Other",
            field: c.field || null,
            currentValue: c.currentValue || null,
            requestedValue: c.requestedValue || null,
            reason: c.reason || null,
          })),
      },
    },
    include: { items: true },
  });

  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: { status: "CHANGES_REQUESTED" },
  });

  const versionRow = await db.proposalVersion.findUnique({
    where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
  });
  if (versionRow) {
    await db.proposalVersion.update({ where: { id: versionRow.id }, data: { status: "CHANGES_REQUESTED" } });
  }

  const [workspace, request] = await Promise.all([
    db.workspace.findUnique({ where: { id: proposal.client.workspaceId } }),
    proposal.requirementRequestId ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } }) : null,
  ]);

  await db.clientMessage.create({
    data: {
      clientId: proposal.clientId,
      channel: "EMAIL",
      subject: `Change request — ${proposal.title}`,
      body: `${reference} — ${message.slice(0, 400)}`,
      direction: "IN",
      fromName: input.clientName ?? proposal.client.companyName,
      at: now,
    },
  });
  await recordAudit({
    clientId: proposal.clientId,
    entity: "PROPOSAL",
    action: "STATUS_CHANGED",
    entityId: proposal.id,
    after: { status: "CHANGES_REQUESTED", changeRequestId: created.id, version: proposal.version },
  });
  await db.client.update({ where: { id: proposal.clientId }, data: { lastActivityAt: now } });

  if (request) {
    await recordEvent(
      request.id,
      "PROPOSAL_CHANGES_REQUESTED",
      "Client requested proposal changes",
      `${proposal.reference ?? "PROP"} v${proposal.version} — ${reference}`,
      { proposalId: proposal.id, version: proposal.version, changeRequestId: created.id },
    );
  }

  if (workspace && proposal.client.email) {
    await sendProposalChangeRequestReceivedEmail({
      to: proposal.client.email,
      clientName: proposal.client.companyName,
      projectTitle: proposal.title,
      proposalReference: proposal.reference ?? "PROP",
      companyName: workspace.companyName,
      version: proposal.version,
      link: proposalClientLink(token.trim()),
    }).catch(() => undefined);
  }

  return { changeRequest: created, proposal: saved };
}

/* ── Client decision — true rejection ────────────────────────── */

export async function rejectProposal(
  token: string,
  input: { reason: string; details?: string; clientName?: string },
) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved) throw new Error("Proposal not found.");
  if (resolved.error) throw new Error("This proposal can no longer be reviewed.");
  const { proposal } = resolved;
  const reason = input.reason.trim();
  if (!reason) throw new Error("Tell us why you're not proceeding.");

  const now = new Date();
  const rejection = await db.proposalRejection.create({
    data: {
      proposalId: proposal.id,
      workspaceId: proposal.client.workspaceId,
      clientId: proposal.clientId,
      proposalVersion: proposal.version,
      reason,
      details: input.details?.trim() || null,
      clientName: input.clientName ?? proposal.client.companyName,
    },
  });

  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: {
      status: "REJECTED",
      rejectedAt: now,
      rejectedReason: reason,
      rejectedDetails: input.details?.trim() || null,
      tokenRevokedAt: now,
      tokenRevokedReason: "Rejected by client",
    },
  });

  const versionRow = await db.proposalVersion.findUnique({
    where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
  });
  if (versionRow) {
    await db.proposalVersion.update({ where: { id: versionRow.id }, data: { status: "REJECTED" } });
  }

  const [workspace, request] = await Promise.all([
    db.workspace.findUnique({ where: { id: proposal.client.workspaceId } }),
    proposal.requirementRequestId ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } }) : null,
  ]);

  await db.clientMessage.create({
    data: {
      clientId: proposal.clientId,
      channel: "EMAIL",
      subject: `Proposal declined — ${proposal.title}`,
      body: `${reason}${input.details ? ` — ${input.details}` : ""}`,
      direction: "IN",
      fromName: input.clientName ?? proposal.client.companyName,
      at: now,
    },
  });
  await recordAudit({
    clientId: proposal.clientId,
    entity: "PROPOSAL",
    action: "STATUS_CHANGED",
    entityId: proposal.id,
    after: { status: "REJECTED", reason, rejectionId: rejection.id },
  });
  await db.client.update({ where: { id: proposal.clientId }, data: { lastActivityAt: now } });

  if (request) {
    await recordEvent(
      request.id,
      "PROPOSAL_REJECTED",
      "Client declined proposal",
      `${proposal.reference ?? "PROP"} v${proposal.version} — ${reason}`,
      { proposalId: proposal.id, rejectionId: rejection.id },
    );
  }

  if (workspace && proposal.client.email) {
    await sendProposalRejectedAckEmail({
      to: proposal.client.email,
      clientName: proposal.client.companyName,
      projectTitle: proposal.title,
      companyName: workspace.companyName,
    }).catch(() => undefined);
  }

  return { rejection, proposal: saved };
}

/* ── Admin — decide a change request ─────────────────────────── */

export async function decideChangeRequest(input: {
  changeRequestId: string;
  decision: "accept" | "decline" | "clarification";
  response?: string;
  actorName: string;
}) {
  const changeRequest = await db.proposalChangeRequest.findUnique({
    where: { id: input.changeRequestId },
    include: { items: true },
  });
  if (!changeRequest) throw new Error("Change request not found.");
  if (changeRequest.status === "IMPLEMENTED" || changeRequest.status === "RESOLVED") {
    throw new Error("This change request is already resolved.");
  }

  const now = new Date();
  const response = input.response?.trim() || null;

  if (input.decision === "accept") {
    await db.proposalChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: "ACCEPTED", adminResponse: response, decidedAt: now },
    });
    await db.proposalChangeRequestItem.updateMany({
      where: { changeRequestId: changeRequest.id, status: "PENDING" },
      data: { status: "ACCEPTED", adminResponse: response },
    });
    // The accepted changes feed the next revision.
    await db.clientProposal.update({
      where: { id: changeRequest.proposalId },
      data: { status: "REVISION_IN_PROGRESS" },
    });
  } else if (input.decision === "decline") {
    await db.proposalChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: "DECLINED", adminResponse: response, decidedAt: now },
    });
    await db.proposalChangeRequestItem.updateMany({
      where: { changeRequestId: changeRequest.id, status: "PENDING" },
      data: { status: "DECLINED", adminResponse: response },
    });
  } else {
    await db.proposalChangeRequest.update({
      where: { id: changeRequest.id },
      data: { status: "CLARIFICATION_REQUIRED", adminResponse: response, decidedAt: now },
    });
  }

  const [proposal, workspace, client] = await Promise.all([
    db.clientProposal.findUnique({ where: { id: changeRequest.proposalId } }),
    db.workspace.findUnique({ where: { id: changeRequest.workspaceId } }),
    db.client.findUnique({ where: { id: changeRequest.clientId } }),
  ]);

  if (proposal && client) {
    await recordAudit({
      clientId: client.id,
      entity: "PROPOSAL",
      action: "STATUS_CHANGED",
      entityId: proposal.id,
      actorName: input.actorName,
      after: { changeRequest: changeRequest.id, decision: input.decision, status: proposal.status },
    });
    await db.client.update({ where: { id: client.id }, data: { lastActivityAt: now } });
    if (proposal.requirementRequestId) {
      await recordEvent(
        proposal.requirementRequestId,
        input.decision === "accept" ? "UPDATE_APPLIED" : "UPDATE_PROPOSED",
        input.decision === "accept" ? "Proposal changes accepted" : "Proposal changes decision",
        `${proposal.reference ?? "PROP"} — change request ${changeRequest.reference ?? ""} ${input.decision === "accept" ? "accepted, revision started" : input.decision === "decline" ? "declined" : "needs clarification"}`,
        { proposalId: proposal.id, changeRequestId: changeRequest.id, decision: input.decision },
      );
    }

    if (client.email && workspace) {
      await sendProposalChangeRequestDecisionEmail({
        to: client.email,
        clientName: client.companyName,
        projectTitle: proposal.title,
        proposalReference: proposal.reference ?? "PROP",
        companyName: workspace.companyName,
        accepted: input.decision === "accept",
        response,
        link: proposalClientLink(await proposalRawToken(proposal.id)),
      }).catch(() => undefined);
    }
  }  return db.proposalChangeRequest.findUnique({
    where: { id: changeRequest.id },
    include: { items: true },
  });
}

/**
 * Recover a working client link for a proposal after it has been sent. The raw
 * token is not stored — re-issue a fresh one (replacing the stored hash) so
 * admin emails and the change-request decision emails always carry a live link.
 */
async function proposalRawToken(proposalId: string): Promise<string> {
  const proposal = await db.clientProposal.findUnique({ where: { id: proposalId } });
  if (!proposal?.tokenHash) throw new Error("Proposal has no client access token — send it to the client first.");
  const { token, tokenHash, expiresAt } = issueProposalToken();
  await db.clientProposal.update({
    where: { id: proposalId },
    data: { tokenHash, tokenExpiresAt: expiresAt },
  });
  return token;
}

/* ── Admin — create the next revision ──────────────────────────*/

export async function createProposalRevision(input: {
  proposal: ClientProposal;
  actorId: string;
  actorName: string;
}) {
  const { proposal } = input;
  if (proposal.status === "APPROVED" || proposal.status === "REJECTED") {
    throw new Error("An approved or declined proposal cannot be revised.");
  }

  const nextVersion = proposal.version + 1;
  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: {
      version: nextVersion,
      status: "REVISION_IN_PROGRESS",
      finalizedAt: null,
      pdfPath: null,
      pdfPages: null,
    },
  });

  // New working version snapshot starts as an empty DRAFT row.
  await db.proposalVersion.upsert({
    where: { proposalId_version: { proposalId: proposal.id, version: nextVersion } },
    create: {
      proposalId: proposal.id,
      version: nextVersion,
      title: proposal.title,
      amount: proposal.amount,
      currency: proposal.currency,
      document: proposal.document,
      status: "REVISION_IN_PROGRESS",
      basedOnVersion: proposal.version,
    },
    update: { basedOnVersion: proposal.version, status: "REVISION_IN_PROGRESS" },
  });

  await recordAudit({
    clientId: proposal.clientId,
    entity: "PROPOSAL",
    action: "STATUS_CHANGED",
    entityId: proposal.id,
    actorId: input.actorId,
    actorName: input.actorName,
    after: { status: "REVISION_IN_PROGRESS", version: nextVersion, basedOn: proposal.version },
  });
  if (proposal.requirementRequestId) {
    await recordEvent(
      proposal.requirementRequestId,
      "UPDATE_PROPOSED",
      "Proposal revision started",
      `${proposal.reference ?? "PROP"} v${nextVersion} based on v${proposal.version}`,
      { proposalId: proposal.id, version: nextVersion },
    );
  }
  return saved;
}

/* ── Finalize — freeze one immutable version ─────────────────── */

export async function snapshotProposalVersion(input: {
  proposal: ClientProposal;
  document: string;
  pdfPath: string;
  pages: number;
  actorName: string;
}) {
  const { proposal } = input;
  const now = new Date();
  await db.proposalVersion.upsert({
    where: { proposalId_version: { proposalId: proposal.id, version: proposal.version } },
    create: {
      proposalId: proposal.id,
      version: proposal.version,
      title: proposal.title,
      amount: proposal.amount,
      currency: proposal.currency,
      document: input.document,
      pdfPath: input.pdfPath,
      pdfPages: input.pages,
      status: "FINALIZED",
      createdByName: input.actorName,
      finalizedAt: now,
    },
    update: {
      document: input.document,
      pdfPath: input.pdfPath,
      pdfPages: input.pages,
      status: "FINALIZED",
      finalizedAt: now,
    },
  });
  await recordAudit({
    clientId: proposal.clientId,
    entity: "PROPOSAL",
    action: "STATUS_CHANGED",
    entityId: proposal.id,
    actorName: input.actorName,
    after: { status: "FINALIZED", version: proposal.version, pages: input.pages },
  });
  if (proposal.requirementRequestId) {
    await recordEvent(
      proposal.requirementRequestId,
      "PROPOSAL_FINALIZED",
      "Proposal finalized",
      `${proposal.reference ?? "PROP"} v${proposal.version} — ${input.pages} pages`,
      { proposalId: proposal.id, version: proposal.version },
    );
  }
}

/* ── Serialization — the delivery journey for the studio ─────── */

export type ProposalDeliveryBundle = Awaited<ReturnType<typeof serializeProposalDelivery>>;

export async function serializeProposalDelivery(
  proposal: ClientProposal & { client: { id: string; companyName: string; email: string | null; workspaceId: string } },
) {
  const [deliveries, views, approvals, changeRequests, versions, projects] = await Promise.all([
    db.proposalDelivery.findMany({ where: { proposalId: proposal.id }, orderBy: { createdAt: "asc" } }),
    db.proposalView.findMany({ where: { proposalId: proposal.id }, orderBy: { lastViewedAt: "desc" } }),
    db.proposalApproval.findMany({ where: { proposalId: proposal.id }, orderBy: { approvedAt: "asc" } }),
    db.proposalChangeRequest.findMany({
      where: { proposalId: proposal.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    db.proposalVersion.findMany({ where: { proposalId: proposal.id }, orderBy: { version: "asc" } }),
    db.clientProject.findMany({ where: { clientId: proposal.clientId }, select: { id: true, name: true, stage: true } }),
  ]);

  const nextAction = proposalNextAction(proposal);

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      reference: proposal.reference,
      title: proposal.title,
      version: proposal.version,
      status: proposal.status,
      pdfPath: proposal.pdfPath,
      pdfPages: proposal.pdfPages,
      finalizedAt: proposal.finalizedAt,
      sentAt: proposal.sentAt,
      viewedAt: proposal.viewedAt,
      firstViewedAt: proposal.firstViewedAt,
      lastViewedAt: proposal.lastViewedAt,
      viewCount: proposal.viewCount,
      sentTo: proposal.sentTo,
      sentToName: proposal.sentToName,
      rejectedAt: proposal.rejectedAt,
      rejectedReason: proposal.rejectedReason,
    },
    nextAction,
    deliveries: deliveries.map((d) => ({
      id: d.id,
      kind: d.kind,
      status: d.status,
      recipient: d.recipientEmail,
      recipientName: d.recipientName,
      version: d.proposalVersion,
      sentAt: d.sentAt,
      failedAt: d.failedAt,
      failureReason: d.failureReason,
      createdAt: d.createdAt,
    })),
    views: views.map((v) => ({
      id: v.id,
      firstViewedAt: v.firstViewedAt,
      lastViewedAt: v.lastViewedAt,
      viewCount: v.viewCount,
      pdfOpened: v.pdfOpened,
      pdfViewedAt: v.pdfViewedAt,
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      version: a.proposalVersion,
      approvedAt: a.approvedAt,
      clientName: a.clientName,
      method: a.approvalMethod,
    })),
    changeRequests: changeRequests.map((cr) => ({
      id: cr.id,
      reference: cr.reference,
      version: cr.proposalVersion,
      reasons: safeJsonArray(cr.reasons),
      sections: safeJsonArray(cr.sections),
      message: cr.message,
      priority: cr.priority,
      status: cr.status,
      adminResponse: cr.adminResponse,
      submittedByName: cr.submittedByName,
      submittedAt: cr.submittedAt,
      decidedAt: cr.decidedAt,
      items: cr.items.map((i) => ({
        id: i.id,
        section: i.section,
        field: i.field,
        currentValue: i.currentValue,
        requestedValue: i.requestedValue,
        reason: i.reason,
        status: i.status,
        adminResponse: i.adminResponse,
      })),
    })),
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      amount: v.amount,
      status: v.status,
      pdfPath: v.pdfPath,
      pdfPages: v.pdfPages,
      basedOnVersion: v.basedOnVersion,
      changeRequestIds: safeJsonArray(v.changeRequestIds),
      createdByName: v.createdByName,
      finalizedAt: v.finalizedAt,
      sentAt: v.sentAt,
      approvedAt: v.approvedAt,
      createdAt: v.createdAt,
    })),
    projects,
  };
}

/** The client-safe proposal summary for the secure page. */
export async function serializeClientProposal(token: string) {
  const resolved = await resolveProposalByToken(token);
  if (!resolved) {
    return { ok: false as const, error: "NOT_FOUND", errorLabel: null };
  }
  if (resolved.error) {
    return { ok: false as const, error: resolved.error, errorLabel: resolved.errorLabel };
  }
  const { proposal } = resolved;
  const [client, workspace, approvals, changeRequests, deliveries] = await Promise.all([
    db.client.findUnique({ where: { id: proposal.clientId }, select: { companyName: true, industry: true, email: true } }),
    db.workspace.findUnique({ where: { id: proposal.client.workspaceId }, select: { companyName: true, id: true } }),
    db.proposalApproval.findMany({
      where: { proposalId: proposal.id },
      orderBy: { approvedAt: "desc" },
      take: 1,
    }),
    db.proposalChangeRequest.findMany({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.proposalDelivery.findMany({ where: { proposalId: proposal.id }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  let parsedDoc: Record<string, unknown> = {};
  try {
    parsedDoc = JSON.parse(proposal.document || "{}");
  } catch {
    parsedDoc = {};
  }

  const documentMeta = (parsedDoc.meta && typeof parsedDoc.meta === "object") ? parsedDoc.meta as Record<string, unknown> : {};
  const sections = Array.isArray(parsedDoc.sections) ? parsedDoc.sections : [];

  const document = {
    version: proposal.version,
    meta: {
      reference: proposal.reference ?? "PROP",
      title: proposal.title,
      clientName: client?.companyName ?? "",
      preparedBy: workspace?.companyName ?? "",
      preparedFor: client?.email ?? null,
      amount: proposal.amount,
      currency: proposal.currency,
      amountLabel: typeof documentMeta.amountLabel === "string" ? documentMeta.amountLabel : amountLabel(proposal.amount),
      timelineLabel: typeof documentMeta.timelineLabel === "string" ? documentMeta.timelineLabel : "",
      date: proposal.createdAt.toISOString(),
    },
    sections,
  };

  return {
    ok: true as const,
    error: null as null,
    errorLabel: null as null,
    proposal: {
      id: proposal.id,
      reference: proposal.reference ?? "PROP",
      title: proposal.title,
      version: proposal.version,
      status: proposal.status,
      amount: proposal.amount,
      amountLabel: document.meta.amountLabel,
      timelineLabel: document.meta.timelineLabel,
      pdfPages: proposal.pdfPages,
      clientName: client?.companyName ?? "",
      preparedBy: workspace?.companyName ?? "",
      sentAt: proposal.sentAt ? proposal.sentAt.toISOString() : null,
      viewedAt: proposal.viewedAt ? proposal.viewedAt.toISOString() : null,
      lastApprovedAt: approvals[0]?.approvedAt ? approvals[0].approvedAt.toISOString() : null,
      approved: proposal.status === "APPROVED",
      rejected: proposal.status === "REJECTED",
      changeRequests: changeRequests.map((cr) => ({
        id: cr.id,
        reference: cr.reference,
        status: cr.status,
        message: cr.message,
        adminResponse: cr.adminResponse,
        submittedAt: cr.submittedAt ? cr.submittedAt.toISOString() : "",
        reasons: safeJsonArray(cr.reasons),
        sections: safeJsonArray(cr.sections),
      })),
      deliveryCount: deliveries.length,
    },
    document,
  };
}

/* ── Small helpers ───────────────────────────────────────────── */

function safeJsonArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
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

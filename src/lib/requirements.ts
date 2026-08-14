import { db } from "./db";
import { generateToken, hashToken, tokenExpiry } from "./tokens";
import { recordAudit } from "./clients";
import {
  computeCompleteness,
  computeReadiness,
  getSection,
  requestStatusLabel,
  sectionStates,
  SECTIONS,
  type CompletionContext,
  type Readiness,
} from "./requirement-config";
import type { RequirementProjectType, RequirementRequest, RequirementRequestStatus } from "@/generated/prisma/client";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT WORKSPACE — DOMAIN LOGIC
   Token access, serialization, readiness, submission, revisions,
   and the handoff into the Client Command Center. Every query is
   workspace- or token-scoped — never trust a raw id.
──────────────────────────────────────────────────────────────── */

const TOKEN_VALID_HOURS = 24 * 30; // 30 days

/* ── Token helpers ──────────────────────────────────────────── */

export function issueToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = generateToken(32);
  return { token, tokenHash: hashToken(token), expiresAt: tokenExpiry(TOKEN_VALID_HOURS) };
}

export function requirementLink(token: string): string {
  return `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/client-requirement/${token}`;
}

/** Resolve a request by raw token — validates hash, revocation and expiry. */
export async function resolveRequestByToken(token: string) {
  const tokenHash = hashToken(token.trim());
  const request = await db.requirementRequest.findUnique({
    where: { tokenHash },
    include: { client: { select: { companyName: true, workspaceId: true } } },
  });
  if (!request) return null;
  if (request.tokenRevokedAt) {
    return { request, error: "REVOKED" as const, errorLabel: request.tokenRevokedReason };
  }
  if (request.tokenExpiresAt && request.tokenExpiresAt < new Date()) {
    return { request, error: "EXPIRED" as const, errorLabel: null };
  }
  return { request, error: null, errorLabel: null };
}

/* ── Reference codes ────────────────────────────────────────── */

export async function nextReference(workspaceId: string): Promise<string> {
  const count = await db.requirementRequest.count({ where: { workspaceId } });
  return `REQ-${String(count + 1).padStart(6, "0")}`;
}

/* ── Events ─────────────────────────────────────────────────── */

export async function recordEvent(
  requestId: string,
  type: string,
  label: string,
  detail?: string,
  meta?: Record<string, unknown>,
) {
  await db.requirementEvent.create({
    data: {
      requestId,
      type: type as never,
      label,
      detail,
      meta: meta ? JSON.stringify(meta) : "{}",
    },
  });
}

/* ── Create ─────────────────────────────────────────────────── */

export async function createRequirementRequest(input: {
  workspaceId: string;
  clientId: string;
  title: string;
  projectType: RequirementProjectType;
  actorId: string;
  actorName: string;
}) {
  const { token, tokenHash, expiresAt } = issueToken();
  const reference = await nextReference(input.workspaceId);
  const request = await db.requirementRequest.create({
    data: {
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      reference,
      title: input.title,
      projectType: input.projectType,
      tokenHash,
      tokenExpiresAt: expiresAt,
      createdById: input.actorId,
      createdByName: input.actorName,
    },
  });
  await recordEvent(request.id, "REQUEST_CREATED", "Requirement request created", input.title);
  return { request, token };
}

/* ── Answer loading / saving ────────────────────────────────── */

type AnswerMap = Record<string, Record<string, unknown>>;

export async function loadAnswers(requestId: string): Promise<AnswerMap> {
  const rows = await db.requirementAnswer.findMany({ where: { requestId } });
  const map: AnswerMap = {};
  for (const row of rows) {
    try {
      map[row.section] = JSON.parse(row.data);
    } catch {
      map[row.section] = {};
    }
  }
  return map;
}

export function completionContext(
  featureCount: number,
  attachmentCount: number,
  mustHaveCount = 0,
): CompletionContext {
  return { featureCount, mustHaveCount, attachmentCount };
}

export async function saveSectionAnswer(input: {
  request: RequirementRequest;
  section: string;
  data: Record<string, unknown>;
  recordEvent?: boolean;
}) {
  const section = getSection(input.section);
  if (!section) throw new Error("Unknown section");

  const answers = await loadAnswers(input.request.id);
  answers[input.section] = input.data;

  const features = await db.requirementFeature.findMany({ where: { requestId: input.request.id } });
  const attachments = await db.requirementAttachment.count({ where: { requestId: input.request.id } });
  const ctx = { featureCount: features.length, mustHaveCount: features.filter((f) => f.priority === "MUST_HAVE").length, attachmentCount: attachments };
  const wasComplete = section.complete(answers[input.section] ?? {}, ctx);

  const existing = await db.requirementAnswer.findUnique({
    where: { requestId_section: { requestId: input.request.id, section: input.section } },
  });

  await db.requirementAnswer.upsert({
    where: { requestId_section: { requestId: input.request.id, section: input.section } },
    create: {
      requestId: input.request.id,
      section: input.section,
      data: JSON.stringify(input.data),
      completedAt: wasComplete ? new Date() : null,
    },
    update: {
      data: JSON.stringify(input.data),
      completedAt: wasComplete ? new Date() : null,
    },
  });

  const completeness = computeCompleteness(answers, ctx);
  const readiness = computeReadiness(answers, ctx).total;

  const updated = await db.requirementRequest.update({
    where: { id: input.request.id },
    data: {
      currentSection: input.section,
      completeness: completeness.percent,
      readiness,
      lastOpenedAt: new Date(),
      ...(input.request.status === "SENT" ? { status: "IN_PROGRESS" } : {}),
    },
  });

  if (input.recordEvent !== false) {
    if (wasComplete && !existing?.completedAt) {
      await recordEvent(input.request.id, "SECTION_COMPLETED", `${section.label} completed`, section.title);
    } else {
      await recordEvent(input.request.id, "SECTION_SAVED", `${section.label} updated`);
    }
  }

  return updated;
}

/* ── Feature storage ────────────────────────────────────────── */

export async function saveFeatures(
  request: RequirementRequest,
  features: {
    name: string;
    priority: string;
    users: string[];
    description: string;
    config: Record<string, unknown>;
    acceptanceCriteria: string[];
    dependencies: string[];
  }[],
) {
  const existing = await db.requirementFeature.findMany({ where: { requestId: request.id } });
  const keep = new Set(features.map((f) => f.name));
  const removed = existing.filter((e) => !keep.has(e.name));
  if (removed.length > 0) {
    await db.requirementFeature.deleteMany({
      where: { requestId: request.id, id: { in: removed.map((r) => r.id) } },
    });
  }
  for (const f of features) {
    const prior = existing.find((e) => e.name === f.name);
    await db.requirementFeature.upsert({
      where: { id: prior?.id ?? "none" },
      create: {
        requestId: request.id,
        name: f.name,
        priority: f.priority as never,
        users: JSON.stringify(f.users),
        description: f.description,
        config: JSON.stringify(f.config),
        acceptanceCriteria: JSON.stringify(f.acceptanceCriteria),
        dependencies: JSON.stringify(f.dependencies),
        order: features.indexOf(f),
      },
      update: {
        priority: f.priority as never,
        users: JSON.stringify(f.users),
        description: f.description,
        config: JSON.stringify(f.config),
        acceptanceCriteria: JSON.stringify(f.acceptanceCriteria),
        dependencies: JSON.stringify(f.dependencies),
        order: features.indexOf(f),
      },
    });
  }
}

export async function loadFeatures(requestId: string) {
  const rows = await db.requirementFeature.findMany({ where: { requestId }, orderBy: { order: "asc" } });
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    priority: f.priority,
    users: safeJsonArray(f.users),
    description: f.description,
    config: safeJsonObject(f.config),
    acceptanceCriteria: safeJsonArray(f.acceptanceCriteria),
    dependencies: safeJsonArray(f.dependencies),
  }));
}

/* ── Serialization ──────────────────────────────────────────── */

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

/** The full state a client needs — everything scoped to this token. */
export async function serializePublicRequest(request: RequirementRequest) {
  const [answers, features, attachments, comments, contacts] = await Promise.all([
    loadAnswers(request.id),
    loadFeatures(request.id),
    db.requirementAttachment.findMany({
      where: { requestId: request.id },
      select: { id: true, name: true, size: true, mime: true, section: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.requirementComment.findMany({
      where: { requestId: request.id },
      select: { id: true, author: true, authorName: true, section: true, message: true, resolvedAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // The client's own contacts — the stakeholder builder suggests these so
    // the client never re-enters people the workspace already knows.
    db.contact.findMany({
      where: { clientId: request.clientId },
      select: { id: true, name: true, role: true, email: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      take: 12,
    }),
  ]);

  const states = sectionStates(
    answers,
    completionContext(
      features.length,
      attachments.length,
      features.filter((f) => f.priority === "MUST_HAVE").length,
    ),
  );

  return {
    ok: true,
    request: {
      reference: request.reference,
      title: request.title,
      projectType: request.projectType,
      status: request.status,
      revision: request.revision,
      companyName: (request as unknown as { client: { companyName: string } }).client.companyName,
      currentSection: request.currentSection,
      completeness: request.completeness,
      readiness: request.readiness,
      submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
      changesRequestedAt: null,
      canEdit: !["SUBMITTED", "REVISION_SUBMITTED", "APPROVED", "REVOKED"].includes(request.status),
    },
    answers,
    features,
    attachments: attachments.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      mime: a.mime,
      section: a.section,
      createdAt: a.createdAt.toISOString(),
    })),
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, role: c.role, email: c.email })),
    comments: comments.map((c) => ({
      id: c.id,
      author: c.author,
      authorName: c.authorName,
      section: c.section,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
    })),
    states,
    hasOpenChanges:
      request.status === "CHANGES_REQUESTED" &&
      comments.some((c) => c.author === "ADMIN" && !c.resolvedAt),
    openChange: (() => {
      if (request.status !== "CHANGES_REQUESTED") return null;
      const open = comments.find((c) => c.author === "ADMIN" && !c.resolvedAt);
      return open
        ? { id: open.id, section: open.section, message: open.message, createdAt: open.createdAt.toISOString() }
        : null;
    })(),
    responder: {
      name: request.responderName,
      role: request.responderRole,
      email: request.responderEmail,
    },
  };
}

/** Full admin bundle for the Requirement Command Center. */
export async function serializeAdminRequest(request: RequirementRequest) {
  const [answers, features, attachments, comments, revisions, events, client, proposals] =
    await Promise.all([
      loadAnswers(request.id),
      loadFeatures(request.id),
      db.requirementAttachment.findMany({
        where: { requestId: request.id },
        select: { id: true, name: true, size: true, mime: true, section: true, path: true, uploadedByName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db.requirementComment.findMany({
        where: { requestId: request.id },
        select: { id: true, author: true, authorName: true, section: true, message: true, resolvedAt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.requirementRevision.findMany({ where: { requestId: request.id }, orderBy: { revision: "asc" } }),
      db.requirementEvent.findMany({
        where: { requestId: request.id },
        select: { id: true, type: true, label: true, detail: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      db.client.findUnique({ where: { id: request.clientId } }),
      db.clientProposal.findMany({
        where: { clientId: request.clientId },
        select: { id: true, title: true, status: true, amount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const states = sectionStates(
    answers,
    completionContext(
      features.length,
      attachments.length,
      features.filter((f) => f.priority === "MUST_HAVE").length,
    ),
  );

  return {
    ok: true,
    request: {
      id: request.id,
      reference: request.reference,
      title: request.title,
      projectType: request.projectType,
      status: request.status,
      statusLabel: requestStatusLabel(request.status),
      revision: request.revision,
      completeness: request.completeness,
      readiness: request.readiness,
      sentTo: request.sentTo,
      sentAt: request.sentAt,
      lastOpenedAt: request.lastOpenedAt,
      submittedAt: request.submittedAt,
      approvedAt: request.approvedAt,
      responderName: request.responderName,
      responderRole: request.responderRole,
      createdAt: request.createdAt,
      token: null as string | null, // never expose the token in admin bundles
      link: null as string | null,
      canSend: request.status === "DRAFT",
    },
    client: client
      ? {
          id: client.id,
          companyName: client.companyName,
          industry: client.industry,
          status: client.status,
        }
      : null,
    answers,
    features,
    attachments: attachments.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      mime: a.mime,
      section: a.section,
      uploadedByName: a.uploadedByName,
      createdAt: a.createdAt,
    })),
    comments,
    revisions: revisions.map((r) => ({
      id: r.id,
      revision: r.revision,
      submittedByName: r.submittedByName,
      submittedAt: r.submittedAt,
      changes: safeJsonArray(r.changes),
    })),
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      detail: e.detail,
      createdAt: e.createdAt,
    })),
    states,
    proposals,
  };
}

/* ── Submission & revisions ─────────────────────────────────── */

type Snapshot = { answers: AnswerMap; features: ReturnType<typeof JSON.parse>[]; files: string[] };

async function buildSnapshot(requestId: string): Promise<Snapshot> {
  const [answers, features, attachments] = await Promise.all([
    loadAnswers(requestId),
    loadFeatures(requestId),
    db.requirementAttachment.findMany({ where: { requestId }, select: { name: true } }),
  ]);
  return {
    answers,
    features,
    files: attachments.map((a) => a.name),
  };
}

/** Human-readable diff between two snapshots — shown in the Activity tab. */
export function diffSnapshots(prev: Snapshot, next: Snapshot): string[] {
  const changes: string[] = [];
  for (const section of SECTIONS) {
    const a = prev.answers[section.key] ?? {};
    const b = next.answers[section.key] ?? {};
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(`${section.label} updated`);
    }
  }
  for (const f of next.features) {
    const prior = prev.features.find((p) => p.name === f.name);
    if (!prior) {
      changes.push(`Added feature — ${f.name}`);
      continue;
    }
    if (JSON.stringify(prior) !== JSON.stringify(f)) changes.push(`Feature updated — ${f.name}`);
    if (prior.config?.provider && f.config?.provider && prior.config.provider !== f.config.provider) {
      changes.push(`${f.name} provider changed: ${prior.config.provider} → ${f.config.provider}`);
    }
  }
  for (const f of prev.features) {
    if (!next.features.some((n) => n.name === f.name)) changes.push(`Removed feature — ${f.name}`);
  }
  const addedFiles = next.files.filter((f) => !prev.files.includes(f));
  if (addedFiles.length > 0) changes.push(`Added ${addedFiles.length} file${addedFiles.length === 1 ? "" : "s"}`);
  return changes.length > 0 ? changes : ["Minor adjustments"];
}

export async function submitRequirementRequest(input: {
  request: RequirementRequest;
  responderName?: string;
  responderRole?: string;
  responderEmail?: string;
  resubmit?: boolean;
}) {
  const { request, resubmit } = input;
  if (["APPROVED", "REVOKED"].includes(request.status)) {
    throw new Error("This requirement request can no longer be submitted.");
  }

  const [answers, features, attachments] = await Promise.all([
    loadAnswers(request.id),
    loadFeatures(request.id),
    db.requirementAttachment.count({ where: { requestId: request.id } }),
  ]);
  const ctx = {
    featureCount: features.length,
    mustHaveCount: features.filter((f) => f.priority === "MUST_HAVE").length,
    attachmentCount: attachments,
  };
  const readiness = computeReadiness(answers, ctx);

  // Duplicate-submission protection: same answers re-submitted is a no-op.
  const lastRevision = await db.requirementRevision.findFirst({
    where: { requestId: request.id },
    orderBy: { revision: "desc" },
  });
  const snapshot = await buildSnapshot(request.id);
  if (
    lastRevision &&
    lastRevision.snapshot === JSON.stringify(snapshot) &&
    !resubmit
  ) {
    return { submitted: false, reason: "NO_CHANGES" as const, request };
  }

  const nextRevision = resubmit ? request.revision + 1 : 1;
  let changes: string[] = [];
  if (lastRevision) {
    changes = diffSnapshots(safeSnapshot(lastRevision.snapshot), snapshot);
  } else {
    changes = ["Initial submission"];
  }

  await db.requirementRevision.create({
    data: {
      requestId: request.id,
      revision: nextRevision,
      submittedByName: input.responderName ?? "Client",
      snapshot: JSON.stringify(snapshot),
      changes: JSON.stringify(changes),
    },
  });

  const status = resubmit ? "REVISION_SUBMITTED" : "SUBMITTED";
  const updated = await db.requirementRequest.update({
    where: { id: request.id },
    data: {
      status: status as never,
      revision: nextRevision,
      submittedAt: new Date(),
      responderName: input.responderName,
      responderRole: input.responderRole,
      responderEmail: input.responderEmail,
      readiness: readiness.total,
      completeness: computeCompleteness(answers, ctx).percent,
    },
  });

  await recordEvent(
    request.id,
    resubmit ? "REVISION_SUBMITTED" : "SUBMITTED",
    resubmit ? `Revision ${nextRevision} submitted` : "Requirements submitted",
    `${changes.length} change${changes.length === 1 ? "" : "s"}`,
  );

  await syncClientRequirement(updated);    return { submitted: true, reason: null, request: updated };
}

function safeSnapshot(json: string): Snapshot {
  try {
    return JSON.parse(json);
  } catch {
    return { answers: {}, features: [], files: [] };
  }
}

/**
 * Mirror the request into the Command Center's simple requirement list so
 * the client's health, next-action engine and intelligence strip all react
 * to a submission — one event, every surface updated.
 */
export async function syncClientRequirement(request: RequirementRequest) {
  const status =
    request.status === "APPROVED"
      ? "APPROVED"
      : request.status === "CHANGES_REQUESTED"
        ? "CHANGES_REQUESTED"
        : "UNDER_REVIEW";

  const answers = await loadAnswers(request.id);
  const complete = Object.values(sectionStates(answers, { featureCount: 0, mustHaveCount: 0, attachmentCount: 0 })).filter(Boolean).length;

  const existing = await db.clientRequirement.findFirst({
    where: { clientId: request.clientId, title: request.title },
  });

  const data = {
    title: request.title,
    status: status as never,
    questionCount: SECTIONS.length,
    answeredCount: complete,
    submittedAt: request.submittedAt ?? new Date(),
    approvedAt: request.status === "APPROVED" ? (request.approvedAt ?? new Date()) : null,
  };

  if (existing) {
    await db.clientRequirement.update({ where: { id: existing.id }, data });
  } else {
    await db.clientRequirement.create({
      data: {
        clientId: request.clientId,
        ...data,
        reviewerName: request.createdByName ?? null,
        priority: "MEDIUM",
      },
    });
  }
  await db.client.update({
    where: { id: request.clientId },
    data: { lastActivityAt: new Date() },
  });
}

/* ── Admin transitions ──────────────────────────────────────── */

export async function transitionRequest(input: {
  request: RequirementRequest;
  action: "send" | "remind" | "request-changes" | "approve" | "revoke" | "regenerate";
  actorName: string;
  actorId: string;
  data?: Record<string, unknown>;
}) {
  const { request, action, actorName, actorId } = input;

  switch (action) {
    case "send": {
      const updated = await db.requirementRequest.update({
        where: { id: request.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentTo: input.data?.sentTo ? String(input.data.sentTo) : request.sentTo,
        },
      });
      await recordEvent(request.id, "REQUEST_SENT", "Requirement link sent", updated.sentTo ?? undefined);
      await recordAudit({
        clientId: request.clientId,
        entity: "REQUIREMENT",
        action: "REQUIREMENT_CREATED",
        entityId: request.id,
        actorId,
        actorName,
        after: { title: request.title, reference: request.reference, action: "sent" },
      });
      return updated;
    }
    case "remind": {
      await recordEvent(request.id, "REQUEST_REMINDED", "Reminder sent", request.sentTo ?? undefined);
      return request;
    }
    case "request-changes": {
      const section = input.data?.section ? String(input.data.section) : null;
      const message = input.data?.message ? String(input.data.message).trim() : "";
      if (!message) throw new Error("A clarification message is required.");
      const updated = await db.requirementRequest.update({
        where: { id: request.id },
        data: { status: "CHANGES_REQUESTED" },
      });
      const comment = await db.requirementComment.create({
        data: {
          requestId: request.id,
          author: "ADMIN",
          authorName: actorName,
          section,
          message,
        },
      });
      await recordEvent(
        request.id,
        "CHANGES_REQUESTED",
        "Clarification requested",
        section ? `${getSection(section)?.label ?? section} — ${message.slice(0, 80)}` : message.slice(0, 80),
        { commentId: comment.id },
      );
      await syncClientRequirement(updated);
      return updated;
    }
    case "approve": {
      const updated = await db.requirementRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      await recordEvent(request.id, "APPROVED", "Requirements approved", request.title);
      await recordAudit({
        clientId: request.clientId,
        entity: "REQUIREMENT",
        action: "STATUS_CHANGED",
        entityId: request.id,
        actorId,
        actorName,
        before: { status: request.status },
        after: { status: "APPROVED" },
      });
      await syncClientRequirement(updated);
      return updated;
    }
    case "revoke": {
      const updated = await db.requirementRequest.update({
        where: { id: request.id },
        data: {
          status: "REVOKED",
          tokenRevokedAt: new Date(),
          tokenRevokedReason: input.data?.reason ? String(input.data.reason) : "Revoked by workspace owner",
        },
      });
      await recordEvent(request.id, "REQUEST_REVOKED", "Access revoked", "The secure link is no longer valid");
      return updated;
    }
    case "regenerate": {
      const { token, tokenHash, expiresAt } = issueToken();
      const updated = await db.requirementRequest.update({
        where: { id: request.id },
        data: {
          tokenHash,
          tokenExpiresAt: expiresAt,
          tokenRevokedAt: null,
          tokenRevokedReason: null,
          status: request.status === "REVOKED" ? "SENT" : request.status,
        },
      });
      await recordEvent(request.id, "REQUEST_SENT", "Link regenerated", "A new secure link was issued");
      return { request: updated, token };
    }
  }
}

/** Build the proposal from an approved requirement — zero manual re-entry. */
export async function createProposalFromRequirement(input: {
  request: RequirementRequest;
  actorName: string;
}) {
  const { request } = input;
  const [answers, features, attachments] = await Promise.all([
    loadAnswers(request.id),
    loadFeatures(request.id),
    db.requirementAttachment.findMany({ where: { requestId: request.id }, select: { name: true } }),
  ]);

  const commercial = answers.commercial ?? {};
  const scope = answers.scope ?? {};
  const stakeholders = answers.stakeholders ?? {};
  const design = answers.design ?? {};

  // A budget range may contain a number (e.g. "₹1L – ₹3L" → 3_00_000 ceiling).
  // Use the UPPER bound of the range so the estimate reflects the top of the
  // client's budget, never the floor.
  const budgetRange = String(commercial.budgetRange ?? "");
  const budgetParts = budgetRange.split(/[\u2013\u2014\-–—]/);
  const budgetMatch = [...budgetParts].reverse().find((p) => /\d/.test(p));
  const rawMatch = budgetMatch?.match(/(\d+(?:\.\d+)?)\s*[LK]/);
  let estimatedAmount: number | null = null;
  if (rawMatch) {
    const raw = Number(rawMatch[1]);
    estimatedAmount = rawMatch[0].toUpperCase().includes("L") ? raw * 100_000 : raw * 1_000;
  }

  const proposal = await db.clientProposal.create({
    data: {
      clientId: request.clientId,
      title: `${request.title} — Proposal`,
      amount: estimatedAmount,
      status: "DRAFT",
    },
  });

  // Preserve the full context as an internal note on the client so nothing
  // about the requirement is lost in the handoff.
  const summary = [
    `Prepared from requirement ${request.reference} (revision ${request.revision}).`,
    features.length > 0 ? `Features: ${features.map((f) => f.name).join(", ")}` : null,
    (scope.included as string[])?.length ? `Included: ${(scope.included as string[]).join(", ")}` : null,
    (scope.excluded as string[])?.length ? `Excluded: ${(scope.excluded as string[]).join(", ")}` : null,
    commercial.budgetModel ? `Budget model: ${String(commercial.budgetModel)}` : null,
    commercial.budgetRange ? `Budget range: ${String(commercial.budgetRange)}` : null,
    stakeholders.stakeholders ? `Stakeholders: ${(stakeholders.stakeholders as { name?: string; role?: string }[]).map((s) => s.name ?? "—").join(", ")}` : null,
    attachments.length > 0 ? `Materials: ${attachments.map((a) => a.name).join(", ")}` : null,
    design.style ? `Design direction: ${String(design.style)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await db.clientNote.create({
    data: {
      clientId: request.clientId,
      content: `Proposal "${proposal.title}" created from requirement ${request.reference}.\n\n${summary}`,
      authorName: input.actorName,
    },
  });

  await recordEvent(request.id, "PROPOSAL_CREATED", "Proposal created from requirements", proposal.title);
  await recordAudit({
    clientId: request.clientId,
    entity: "PROPOSAL",
    action: "PROPOSAL_CREATED",
    entityId: proposal.id,
    actorId: request.createdById ?? undefined,
    actorName: input.actorName,
    after: { title: proposal.title, from: request.reference },
  });
  await db.client.update({
    where: { id: request.clientId },
    data: { lastActivityAt: new Date() },
  });

  return proposal;
}

/* ── Admin access & listing (workspace-scoped) ──────────────── */

/** Load a request only if it belongs to the user's workspace. Never leaks existence. */
export async function getRequirementForUser(userId: string, requestId: string) {
  const workspace = await db.workspace.findUnique({ where: { ownerId: userId } });
  if (!workspace) return null;
  return db.requirementRequest.findFirst({ where: { id: requestId, workspaceId: workspace.id } });
}

export const REQUIREMENT_LIST_VIEWS = [
  "all",
  "needs-review",
  "in-progress",
  "changes-requested",
  "approved",
  "draft",
] as const;

export type RequirementListView = (typeof REQUIREMENT_LIST_VIEWS)[number];

const VIEW_STATUS: Record<Exclude<RequirementListView, "all">, RequirementRequestStatus[]> = {
  "needs-review": ["SUBMITTED", "REVISION_SUBMITTED"],
  "in-progress": ["SENT", "IN_PROGRESS"],
  "changes-requested": ["CHANGES_REQUESTED"],
  approved: ["APPROVED"],
  draft: ["DRAFT"],
};

/** List rows for the Requirements dashboard — real counts, workspace-scoped. */
export async function listRequirementRequests(workspaceId: string, view: string, q = "") {
  const where = {
    workspaceId,
    ...(view !== "all" && view in VIEW_STATUS
      ? { status: { in: VIEW_STATUS[view as Exclude<RequirementListView, "all">] } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { reference: { contains: q } },
            { client: { companyName: { contains: q } } },
          ],
        }
      : {}),
  };

  const [rows, statusCounts, total] = await Promise.all([
    db.requirementRequest.findMany({
      where,
      include: { client: { select: { companyName: true, id: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.requirementRequest.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    db.requirementRequest.count({ where: { workspaceId } }),
  ]);

  const counts: Record<string, number> = { all: total };
  for (const g of statusCounts) counts[g.status] = g._count._all;

  return {
    rows: rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      title: r.title,
      projectType: r.projectType,
      status: r.status,
      statusLabel: requestStatusLabel(r.status),
      clientId: r.clientId,
      companyName: r.client.companyName,
      completeness: r.completeness,
      readiness: r.readiness,
      revision: r.revision,
      responderName: r.responderName,
      sentTo: r.sentTo,
      sentAt: r.sentAt,
      lastOpenedAt: r.lastOpenedAt,
      submittedAt: r.submittedAt,
      updatedAt: r.updatedAt,
    })),
    counts,
  };
}

/* ── Readiness for admin views ──────────────────────────────── */

export async function readinessForRequest(requestId: string): Promise<Readiness> {
  const [answers, features, attachments] = await Promise.all([
    loadAnswers(requestId),
    db.requirementFeature.findMany({ where: { requestId } }),
    db.requirementAttachment.count({ where: { requestId } }),
  ]);
  return computeReadiness(answers, {
    featureCount: features.length,
    mustHaveCount: features.filter((f) => f.priority === "MUST_HAVE").length,
    attachmentCount: attachments,
  });
}

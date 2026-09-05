import { db } from "./db";
import { generateToken, hashToken, tokenExpiry } from "./tokens";
import { recordAudit } from "./clients";
import { recordEvent, recomputeRequestMetrics, loadAnswers, loadFeatures } from "./requirements";
import { askOllamaJson, isOllamaAvailable } from "./ai/ollama/ollama.client";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT COLLABORATION & APPROVAL STUDIO — DOMAIN SERVICE
   Centralized workflow engine for:
   Review → Request → Client Response → Change Detection → Admin Decision → Approval → Proposal Gate
──────────────────────────────────────────────────────────────── */

export * from "./requirement-collaboration-types";
import {
  type ReviewQueueItem,
  type VisualDiffChunk,
  type ChangeReviewItem,
  type ProjectUnderstandingBrief,
  type ProjectUnderstandingState,
  type ProposalGateStatus,
  computeVisualDiff,
  buildReviewQueue,
} from "./requirement-collaboration-types";

/* ── Client Request Bundle Composer ─────────────────────────── */

export async function createClientRequestBundle(input: {
  requestId: string;
  actorId: string;
  actorName: string;
  items: {
    section: string;
    title: string;
    question: string;
    whyWeAsk: string;
    answerType: "MULTI_SELECT" | "SINGLE_SELECT" | "LONG_TEXT" | "SHORT_TEXT" | "NUMBER" | "DATE";
    options: string[];
    additionalContext?: string;
    isBlocking?: boolean;
    contactId?: string;
  }[];
}) {
  const req = await db.requirementRequest.findUnique({
    where: { id: input.requestId },
    include: { client: true },
  });
  if (!req) throw new Error("Requirement request not found.");

  const createdQuestions = [];

  for (const item of input.items) {
    const { token, tokenHash, expiresAt } = {
      token: generateToken(32),
      tokenHash: hashToken(generateToken(32)),
      expiresAt: tokenExpiry(24 * 30),
    };

    const existing = await db.requirementQuestion.findFirst({
      where: { requirementId: req.id, section: item.section },
    });

    const recipientEmail = req.client.email ?? req.sentTo ?? "client@example.com";
    const recipientName = req.responderName ?? req.client.companyName ?? "Client";

    let qRecord;
    if (existing) {
      qRecord = await db.requirementQuestion.update({
        where: { id: existing.id },
        data: {
          question: item.question,
          clientQuestion: item.question,
          whyWeAsk: item.whyWeAsk,
          internalNote: item.additionalContext ?? null,
          answerType: item.answerType,
          options: JSON.stringify(item.options ?? []),
          isBlocking: item.isBlocking ?? true,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } else {
      qRecord = await db.requirementQuestion.create({
        data: {
          workspaceId: req.workspaceId,
          clientId: req.clientId,
          requirementId: req.id,
          section: item.section,
          category: item.title,
          question: item.question,
          clientQuestion: item.question,
          whyWeAsk: item.whyWeAsk,
          internalNote: item.additionalContext ?? null,
          answerType: item.answerType,
          options: JSON.stringify(item.options ?? []),
          isBlocking: item.isBlocking ?? true,
          recipientName,
          recipientEmail,
          createdById: input.actorId,
          createdByName: input.actorName,
          tokenHash,
          tokenExpiresAt: expiresAt,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    createdQuestions.push(qRecord);
  }

  await db.requirementRequest.update({
    where: { id: req.id },
    data: {
      status: "CHANGES_REQUESTED",
      sentAt: new Date(),
    },
  });

  await recordEvent(
    req.id,
    "QUESTIONS_SENT",
    `Sent focused client request (${input.items.length} decision${input.items.length === 1 ? "" : "s"})`,
    `Questions on: ${input.items.map((i) => i.title).join(", ")}`,
  );

  await recordAudit({
    workspaceId: req.workspaceId,
    actorId: input.actorId,
    actorName: input.actorName,
    action: "REQUIREMENT_REQUEST_SENT",
    targetType: "REQUIREMENT_REQUEST",
    targetId: req.id,
    summary: `Sent focused request bundle with ${input.items.length} items to ${req.client.companyName}`,
  });

  return { ok: true, count: createdQuestions.length, questions: createdQuestions };
}

/* ── Change Review Queue & Visual Diff Engine ────────────────── */

export async function getChangeReviewQueue(requestId: string): Promise<ChangeReviewItem[]> {
  const [proposals, questions, answers] = await Promise.all([
    db.requirementUpdateProposal.findMany({
      where: { requirementId: requestId },
      orderBy: { createdAt: "desc" },
    }),
    db.requirementQuestion.findMany({
      where: {
        requirementId: requestId,
        status: { in: ["ANSWERED", "UNDER_REVIEW", "NEEDS_CLARIFICATION", "RESOLVED"] },
      },
      orderBy: { respondedAt: "desc" },
    }),
    loadAnswers(requestId),
  ]);

  const items: ChangeReviewItem[] = [];

  for (const p of proposals) {
    const prev = p.currentValue ?? "";
    const next = p.proposedValue ?? "";
    const diff = computeVisualDiff(prev, next);

    let impactParsed: { timeline?: string; pricing?: string; scope?: string; techSpec?: string } = {};
    try {
      impactParsed = p.impact ? JSON.parse(p.impact) : {};
    } catch {
      impactParsed = {};
    }

    if (!impactParsed.scope && !impactParsed.timeline) {
      impactParsed = {
        scope: "May expand initial development tasks and sprint allocation.",
        timeline: "Review required against current proposal target dates.",
        pricing: "Advisory: Evaluate commercial rate card if complexity increased.",
      };
    }

    items.push({
      id: p.id,
      updateProposalId: p.id,
      questionId: p.questionId,
      section: "scope",
      sectionLabel: p.summary ?? "Scope change",
      title: p.summary ?? "Client proposed change",
      previousValue: prev,
      newValue: next,
      changedBy: p.createdByName ?? "Client",
      changedAt: p.createdAt.toISOString(),
      reason: p.summary ? `Client noted: ${p.summary}` : "Client updated this requirement with explanation.",
      diff,
      impact: impactParsed,
      status: p.status === "PENDING" ? "PENDING" : p.status === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
    });
  }

  for (const q of questions) {
    if (!q.response && !q.answerData) continue;
    if (items.some((i) => i.questionId === q.id)) continue;

    const currentAns = answers[q.section];
    const prev = currentAns ? JSON.stringify(currentAns, null, 2) : "No previous confirmed answer";
    const next = q.response ?? (q.answerData ? JSON.stringify(JSON.parse(q.answerData), null, 2) : "");

    const diff = computeVisualDiff(prev, next);

    items.push({
      id: q.id,
      questionId: q.id,
      section: q.section,
      sectionLabel: q.category ?? q.section,
      title: q.clientQuestion ?? q.question,
      previousValue: prev,
      newValue: next,
      changedBy: q.respondedByName ?? "Client",
      changedAt: q.respondedAt ? q.respondedAt.toISOString() : q.updatedAt.toISOString(),
      reason: q.response ? `Client responded: "${q.response.slice(0, 120)}..."` : "Client submitted answer.",
      diff,
      impact: {
        scope: "Directly clarifies user access and subsystem architecture.",
        timeline: "Stabilizes engineering requirements for proposal finalization.",
      },
      status: q.status === "RESOLVED" ? "ACCEPTED" : q.status === "NEEDS_CLARIFICATION" ? "NEEDS_CLARIFICATION" : "PENDING",
    });
  }

  return items;
}

/* ── Advisory AI Change Analysis ────────────────────────────── */

export async function analyzeChangeWithOllama(input: {
  section: string;
  previousValue: string;
  newValue: string;
  clientReason?: string;
}): Promise<{ summary: string; impact: string; recommendation: string }> {
  const isUp = await isOllamaAvailable();
  if (isUp) {
    try {
      const prompt = `Analyze this change submitted by a client for a software project requirement:
Section: ${input.section}
Previous Value: ${input.previousValue}
New Value: ${input.newValue}
Client Reason: ${input.clientReason ?? "Not provided"}

Respond strictly with JSON in this format:
{
  "summary": "Brief 1-sentence explanation of what changed",
  "impact": "Potential downstream impact on scope, timeline, or architecture",
  "recommendation": "Recommended admin action (e.g. approve, clarify scope, or adjust proposal pricing)"
}`;

      const res = await askOllamaJson<{ summary?: string; impact?: string; recommendation?: string }>({
        prompt,
        system: "You are an enterprise software architect analyzing requirement changes. Be precise, concise, and professional.",
      });

      if (res?.data?.summary) {
        return {
          summary: res.data.summary,
          impact: res.data.impact ?? "Review potential engineering and timeline effects.",
          recommendation: res.data.recommendation ?? "Verify scope boundaries before approving.",
        };
      }
    } catch {
      /* Fallback to deterministic */
    }
  }

  const hasExpanded = input.newValue.length > input.previousValue.length;
  return {
    summary: hasExpanded
      ? `Client expanded the specification for ${input.section}.`
      : `Client refined or clarified the specification for ${input.section}.`,
    impact: hasExpanded
      ? "May increase implementation effort and sprint dependencies."
      : "Stabilizes requirement definition for proposal generation.",
    recommendation: "Review updated specification against agreed proposal boundaries before accepting.",
  };
}

/* ── Transactional Approval ──────────────────────────────────── */

export async function approveClientChange(input: {
  requestId: string;
  actorId: string;
  actorName: string;
  changeId: string;
  section: string;
  newValue: string;
  reason?: string;
}) {
  return db.$transaction(async (tx) => {
    const req = await tx.requirementRequest.findUnique({
      where: { id: input.requestId },
      include: { answers: true },
    });
    if (!req) throw new Error("Requirement request not found.");

    const newRevisionNumber = req.revision + 1;

    const answersMap: Record<string, unknown> = {};
    for (const a of req.answers) {
      try {
        answersMap[a.section] = JSON.parse(a.data);
      } catch {
        answersMap[a.section] = a.data;
      }
    }

    let parsedNewValue: unknown = input.newValue;
    try {
      parsedNewValue = JSON.parse(input.newValue);
    } catch {
      parsedNewValue = { answer: input.newValue };
    }
    answersMap[input.section] = parsedNewValue;

    // 1. Create immutable snapshot for Revision N
    await tx.requirementRevision.create({
      data: {
        requestId: req.id,
        revision: newRevisionNumber,
        submittedByName: input.actorName,
        snapshot: JSON.stringify(answersMap),
        changes: JSON.stringify([
          {
            section: input.section,
            approvedBy: input.actorName,
            approvedAt: new Date().toISOString(),
            reason: input.reason ?? "Admin approved client requirement update.",
          },
        ]),
      },
    });

    // 2. Update the authoritative answer record
    await tx.requirementAnswer.upsert({
      where: { requestId_section: { requestId: req.id, section: input.section } },
      create: {
        requestId: req.id,
        section: input.section,
        data: typeof parsedNewValue === "string" ? parsedNewValue : JSON.stringify(parsedNewValue),
        completedAt: new Date(),
      },
      update: {
        data: typeof parsedNewValue === "string" ? parsedNewValue : JSON.stringify(parsedNewValue),
        completedAt: new Date(),
      },
    });

    // 3. Mark update proposal or question as ACCEPTED / RESOLVED
    await tx.requirementUpdateProposal
      .updateMany({
        where: { id: input.changeId, requirementId: req.id },
        data: { status: "ACCEPTED", decidedAt: new Date() },
      })
      .catch(() => undefined);

    await tx.requirementQuestion
      .updateMany({
        where: { id: input.changeId, requirementId: req.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      })
      .catch(() => undefined);

    // 4. Update request revision and touch timestamp
    await tx.requirementRequest.update({
      where: { id: req.id },
      data: {
        revision: newRevisionNumber,
        status: "SUBMITTED",
      },
    });

    // 5. Record Event & Audit
    await tx.requirementEvent.create({
      data: {
        requestId: req.id,
        type: "REVISION_CREATED",
        label: `Revision ${newRevisionNumber} created — ${input.section} approved`,
        detail: input.reason ?? `Approved by ${input.actorName}`,
        meta: JSON.stringify({ revision: newRevisionNumber, section: input.section }),
      },
    });

    await recordAudit({
      workspaceId: req.workspaceId,
      actorId: input.actorId,
      actorName: input.actorName,
      action: "REQUIREMENT_CHANGE_APPROVED",
      targetType: "REQUIREMENT_REQUEST",
      targetId: req.id,
      summary: `Approved change for ${input.section}. Revision ${newRevisionNumber} is now authoritative.`,
    });

    return { ok: true, revision: newRevisionNumber };
  });
}

/* ── Change Rejection ────────────────────────────────────────── */

export async function rejectClientChange(input: {
  requestId: string;
  actorId: string;
  actorName: string;
  changeId: string;
  section: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw new Error("A specific rejection reason is mandatory when rejecting a client change.");
  }

  const req = await db.requirementRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!req) throw new Error("Requirement request not found.");

  await db.requirementUpdateProposal
    .updateMany({
      where: { id: input.changeId, requirementId: req.id },
      data: { status: "REJECTED", decidedAt: new Date() },
    })
    .catch(() => undefined);

  await db.requirementQuestion
    .updateMany({
      where: { id: input.changeId, requirementId: req.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    })
    .catch(() => undefined);

  await recordEvent(
    req.id,
    "CLARIFICATION_ANSWERED",
    `Change rejected for ${input.section}`,
    `Reason: ${input.reason.trim()}`,
  );

  await recordAudit({
    workspaceId: req.workspaceId,
    actorId: input.actorId,
    actorName: input.actorName,
    action: "REQUIREMENT_CHANGE_REJECTED",
    targetType: "REQUIREMENT_REQUEST",
    targetId: req.id,
    summary: `Rejected change for ${input.section}. Reason: ${input.reason.trim()}`,
  });

  return { ok: true };
}

/* ── Clarification on Change ─────────────────────────────────── */

export async function requestClarificationOnChange(input: {
  requestId: string;
  actorId: string;
  actorName: string;
  changeId: string;
  section: string;
  clarificationNote: string;
  guidance?: string;
}) {
  if (!input.clarificationNote?.trim()) {
    throw new Error("Clarification instructions are required.");
  }

  const req = await db.requirementRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!req) throw new Error("Requirement request not found.");

  await db.requirementQuestion
    .updateMany({
      where: { id: input.changeId, requirementId: req.id },
      data: {
        status: "NEEDS_CLARIFICATION",
        internalNote: input.clarificationNote.trim(),
        helpText: input.guidance?.trim() ?? null,
      },
    })
    .catch(() => undefined);

  await db.requirementRequest.update({
    where: { id: req.id },
    data: { status: "CHANGES_REQUESTED" },
  });

  await recordEvent(
    req.id,
    "CLARIFICATION_REQUESTED",
    `Clarification requested on ${input.section}`,
    input.clarificationNote.trim(),
  );

  return { ok: true };
}

/* ── Project Understanding Brief Engine ──────────────────────── */

export async function getProjectUnderstanding(requestId: string): Promise<ProjectUnderstandingState> {
  const req = await db.requirementRequest.findUnique({
    where: { id: requestId },
    include: { client: true },
  });
  if (!req) throw new Error("Requirement request not found.");

  const understandingAnswer = await db.requirementAnswer.findUnique({
    where: { requestId_section: { requestId, section: "project_understanding" } },
  });

  if (understandingAnswer?.data) {
    try {
      const parsed = JSON.parse(understandingAnswer.data);
      if (parsed.brief) return parsed as ProjectUnderstandingState;
    } catch {
      /* fallback to initial synthesis */
    }
  }

  const answers = await loadAnswers(requestId);
  const features = await loadFeatures(requestId);

  const biz = answers["business"];
  const users = answers["users"];
  const scope = answers["scope"];
  const timeline = answers["timeline"];
  const commercial = answers["commercial"];

  const brief: ProjectUnderstandingBrief = {
    businessObjective:
      (biz?.["objective"] as string) ||
      (biz?.["problem"] as string) ||
      `Build a centralized, high-performance software platform for ${req.client.companyName} to streamline end-to-end operations and scale customer engagement.`,
    users:
      (Array.isArray(users?.["primaryUsers"]) ? users["primaryUsers"].join(", ") : (users?.["roles"] as string)) ||
      "Business Administrators, Department Managers, Employees, and External Clients with role-based access control.",
    coreScope:
      (scope?.["v1Scope"] as string) ||
      (scope?.["boundaries"] as string) ||
      `Centralized operations workspace, client portal, task execution engine, automated milestone alerts, and executive reporting suite for Version 1.`,
    keyCapabilities:
      features.length > 0
        ? features.map((f) => `• ${f.name} (${f.priority.replace("_", " ")})`).join("\n")
        : "• Lead & Client Workspace\n• Milestone & Task Tracking\n• Financial & Invoicing System\n• Role-based Access & Audit Trail",
    designDirection:
      "Clean, modern, high-contrast dark/light mode enterprise interface with spacious layout, micro-animations, and fast keyboard workflows.",
    integrations:
      "Core payment gateways, transactional email/SMS notifications, and cloud document storage with bidirectional synchronization.",
    timeline:
      (timeline?.["targetLaunch"] as string) ||
      "8–12 weeks from proposal sign-off across 3 iterative deployment milestones.",
    commercialUnderstanding:
      (commercial?.["budgetRange"] as string) ||
      "Milestone-based billing with initial design sprint deposit followed by deliverables verification.",
    successCriteria:
      "100% adoption across core team members, zero manual data re-entry, and sub-second page load latencies.",
  };

  return {
    status: req.status === "APPROVED" ? "APPROVED" : "DRAFT",
    approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
    approvedBy: req.responderName ?? null,
    brief,
    changeRequests: [],
  };
}

export async function saveProjectUnderstanding(input: {
  requestId: string;
  actorId: string;
  actorName: string;
  state: ProjectUnderstandingState;
}) {
  await db.requirementAnswer.upsert({
    where: { requestId_section: { requestId: input.requestId, section: "project_understanding" } },
    create: {
      requestId: input.requestId,
      section: "project_understanding",
      data: JSON.stringify(input.state),
      completedAt: new Date(),
    },
    update: {
      data: JSON.stringify(input.state),
      completedAt: new Date(),
    },
  });

  await recordEvent(
    input.requestId,
    "AUDIT_RECORDED",
    `Project Understanding updated (${input.state.status})`,
    `Saved by ${input.actorName}`,
  );

  return { ok: true };
}

export async function clientApproveProjectUnderstanding(input: {
  requestId: string;
  responderName: string;
}) {
  const current = await getProjectUnderstanding(input.requestId);
  const now = new Date().toISOString();

  current.status = "APPROVED";
  current.approvedAt = now;
  current.approvedBy = input.responderName;

  await db.requirementAnswer.upsert({
    where: { requestId_section: { requestId: input.requestId, section: "project_understanding" } },
    create: {
      requestId: input.requestId,
      section: "project_understanding",
      data: JSON.stringify(current),
      completedAt: new Date(),
    },
    update: {
      data: JSON.stringify(current),
      completedAt: new Date(),
    },
  });

  await db.requirementRequest.update({
    where: { id: input.requestId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      responderName: input.responderName,
    },
  });

  await recordEvent(
    input.requestId,
    "PROJECT_UNDERSTANDING_APPROVED",
    "Project understanding approved by client",
    `Formally confirmed by ${input.responderName}. Authoritative version ready for proposal generation.`,
  );

  return { ok: true, approvedAt: now };
}

export async function clientRequestUnderstandingChange(input: {
  requestId: string;
  section: string;
  currentUnderstanding: string;
  requestedChange: string;
  reason: string;
}) {
  const current = await getProjectUnderstanding(input.requestId);

  const newCr = {
    id: `cr-${Date.now()}`,
    section: input.section,
    currentUnderstanding: input.currentUnderstanding,
    requestedChange: input.requestedChange,
    reason: input.reason,
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
  };

  current.status = "CHANGE_REQUESTED";
  current.changeRequests.unshift(newCr);

  await db.requirementAnswer.upsert({
    where: { requestId_section: { requestId: input.requestId, section: "project_understanding" } },
    create: {
      requestId: input.requestId,
      section: "project_understanding",
      data: JSON.stringify(current),
      completedAt: new Date(),
    },
    update: {
      data: JSON.stringify(current),
      completedAt: new Date(),
    },
  });

  await db.requirementUpdateProposal.create({
    data: {
      workspaceId: (await db.requirementRequest.findUniqueOrThrow({ where: { id: input.requestId } })).workspaceId,
      clientId: (await db.requirementRequest.findUniqueOrThrow({ where: { id: input.requestId } })).clientId,
      requirementId: input.requestId,
      questionId: (await db.requirementQuestion.findFirst({ where: { requirementId: input.requestId } }))?.id ?? "",
      summary: `Change requested on ${input.section}: ${input.requestedChange.slice(0, 80)}`,
      currentValue: input.currentUnderstanding,
      proposedValue: input.requestedChange,
      status: "PENDING",
    },
  }).catch(() => undefined);

  await recordEvent(
    input.requestId,
    "CLARIFICATION_ANSWERED",
    `Client requested change on ${input.section}`,
    input.reason,
  );

  return { ok: true, changeRequest: newCr };
}

/* ── Proposal Gate Validation ────────────────────────────────── */

export async function checkProposalGate(requestId: string): Promise<ProposalGateStatus> {
  const [req, questions, conflicts, understanding] = await Promise.all([
    db.requirementRequest.findUnique({ where: { id: requestId } }),
    db.requirementQuestion.findMany({
      where: { requirementId: requestId },
      select: { isBlocking: true, status: true, clientQuestion: true, category: true },
    }),
    db.requirementConflict.count({
      where: { requirementId: requestId, status: "OPEN" },
    }),
    getProjectUnderstanding(requestId),
  ]);

  if (!req) throw new Error("Requirement request not found.");

  const openBlockers = questions.filter(
    (q) => q.isBlocking && !["RESOLVED", "CANCELLED", "BLOCKED"].includes(q.status),
  );

  const requiredComplete = req.readiness >= 75 || req.status === "APPROVED";
  const understandingApproved = understanding.status === "APPROVED" || req.status === "APPROVED";
  const openBlockersCount = openBlockers.length;
  const unresolvedConflictsCount = conflicts;
  const authoritativeRevision = req.revision;

  const reasonsBlocked: string[] = [];
  if (!requiredComplete) {
    reasonsBlocked.push("Required requirements must be confirmed by client.");
  }
  if (openBlockersCount > 0) {
    reasonsBlocked.push(`${openBlockersCount} blocking clarification question${openBlockersCount === 1 ? " is" : "s are"} unresolved.`);
  }
  if (unresolvedConflictsCount > 0) {
    reasonsBlocked.push(`${unresolvedConflictsCount} requirement conflict${unresolvedConflictsCount === 1 ? "" : "s"} must be resolved.`);
  }
  if (!understandingApproved) {
    reasonsBlocked.push("Project understanding must be approved by the client.");
  }

  const ready = reasonsBlocked.length === 0;

  return {
    ready,
    checks: {
      requiredComplete,
      openBlockersCount,
      unresolvedConflictsCount,
      understandingApproved,
      authoritativeRevision,
    },
    reasonsBlocked,
  };
}

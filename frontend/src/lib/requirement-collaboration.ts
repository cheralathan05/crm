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

export type ReviewQueueItem = {
  id: string;
  key: string;
  title: string;
  category: string;
  status: "REQUIRED" | "MISSING" | "AMBIGUOUS" | "CONFIRMED";
  whyWeNeedThis: string;
  currentAnswer: string | null;
  suggestedQuestion: string;
  responseType: "MULTI_SELECT" | "SINGLE_SELECT" | "LONG_TEXT" | "SHORT_TEXT" | "NUMBER" | "DATE";
  options: string[];
};

export type VisualDiffChunk = {
  type: "same" | "add" | "remove";
  text: string;
};

export type ChangeReviewItem = {
  id: string;
  questionId?: string;
  updateProposalId?: string;
  section: string;
  sectionLabel: string;
  title: string;
  previousValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  reason: string;
  diff: VisualDiffChunk[];
  impact: {
    timeline?: string;
    pricing?: string;
    scope?: string;
    techSpec?: string;
  };
  aiSummary?: {
    summary: string;
    impact: string;
    recommendation: string;
  };
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "NEEDS_CLARIFICATION";
  adminReason?: string;
};

export type ProjectUnderstandingBrief = {
  businessObjective: string;
  users: string;
  coreScope: string;
  keyCapabilities: string;
  designDirection: string;
  integrations: string;
  timeline: string;
  commercialUnderstanding: string;
  successCriteria: string;
};

export type ProjectUnderstandingState = {
  status: "DRAFT" | "READY_FOR_CLIENT" | "CLIENT_REVIEW" | "CHANGE_REQUESTED" | "APPROVED";
  approvedAt: string | null;
  approvedBy: string | null;
  brief: ProjectUnderstandingBrief;
  changeRequests: {
    id: string;
    section: string;
    currentUnderstanding: string;
    requestedChange: string;
    reason: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    createdAt: string;
  }[];
};

export type ProposalGateStatus = {
  ready: boolean;
  checks: {
    requiredComplete: boolean;
    openBlockersCount: number;
    unresolvedConflictsCount: number;
    understandingApproved: boolean;
    authoritativeRevision: number;
  };
  reasonsBlocked: string[];
};

/* ── Visual Diff Engine ─────────────────────────────────────── */

export function computeVisualDiff(oldText: string, newText: string): VisualDiffChunk[] {
  const o = (oldText ?? "").trim();
  const n = (newText ?? "").trim();
  if (o === n) return [{ type: "same", text: o }];
  if (!o) return [{ type: "add", text: n }];
  if (!n) return [{ type: "remove", text: o }];

  const oldWords = o.split(/(\s+)/);
  const newWords = n.split(/(\s+)/);

  const chunks: VisualDiffChunk[] = [];
  let i = 0;
  let j = 0;

  while (i < oldWords.length && j < newWords.length) {
    if (oldWords[i] === newWords[j]) {
      chunks.push({ type: "same", text: oldWords[i] });
      i++;
      j++;
    } else {
      const nextMatchInNew = newWords.indexOf(oldWords[i], j);
      const nextMatchInOld = oldWords.indexOf(newWords[j], i);

      if (nextMatchInNew !== -1 && (nextMatchInOld === -1 || nextMatchInNew - j <= nextMatchInOld - i)) {
        while (j < nextMatchInNew) {
          chunks.push({ type: "add", text: newWords[j] });
          j++;
        }
      } else if (nextMatchInOld !== -1) {
        while (i < nextMatchInOld) {
          chunks.push({ type: "remove", text: oldWords[i] });
          i++;
        }
      } else {
        chunks.push({ type: "remove", text: oldWords[i] });
        chunks.push({ type: "add", text: newWords[j] });
        i++;
        j++;
      }
    }
  }

  while (i < oldWords.length) {
    chunks.push({ type: "remove", text: oldWords[i] });
    i++;
  }
  while (j < newWords.length) {
    chunks.push({ type: "add", text: newWords[j] });
    j++;
  }

  const merged: VisualDiffChunk[] = [];
  for (const chunk of chunks) {
    if (!chunk.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.type === chunk.type) {
      last.text += chunk.text;
    } else {
      merged.push({ ...chunk });
    }
  }
  return merged;
}

/* ── Review Queue Synthesis ─────────────────────────────────── */

export function buildReviewQueue(
  answers: Record<string, Record<string, unknown>>,
  questions: { section: string; status: string; clientQuestion?: string | null; response?: string | null }[],
  features: { id: string; name: string; priority: string }[],
): ReviewQueueItem[] {
  const qMap = new Map(questions.map((q) => [q.section, q]));

  // 1. Users
  const userAns = answers["users"];
  const usersRaw = (userAns?.["primaryUsers"] ?? userAns?.["roles"] ?? userAns?.["userRoles"]) as unknown;
  const usersConfirmed = Array.isArray(usersRaw) ? usersRaw.filter(Boolean).join(", ") : (typeof usersRaw === "string" ? usersRaw : null);
  const usersQ = qMap.get("users");

  // 2. Scope
  const scopeAns = answers["scope"];
  const scopeRaw = (scopeAns?.["v1Scope"] ?? scopeAns?.["boundaries"] ?? scopeAns?.["description"]) as unknown;
  const scopeConfirmed = typeof scopeRaw === "string" && scopeRaw.trim() ? scopeRaw.trim() : null;
  const scopeQ = qMap.get("scope");

  // 3. Features
  const featuresConfirmed = features.length > 0
    ? `${features.length} capabilities confirmed (${features.filter((f) => f.priority === "MUST_HAVE").length} essential)`
    : null;
  const featuresQ = qMap.get("features");

  // 4. Timeline
  const timelineAns = answers["timeline"];
  const timelineRaw = (timelineAns?.["targetLaunch"] ?? timelineAns?.["duration"] ?? timelineAns?.["deadline"]) as unknown;
  const timelineConfirmed = typeof timelineRaw === "string" && timelineRaw.trim() ? timelineRaw.trim() : null;
  const timelineQ = qMap.get("timeline");

  // 5. Integrations
  const intAns = answers["integrations"];
  const intRaw = (intAns?.["systems"] ?? intAns?.["externalApis"] ?? intAns?.["tools"]) as unknown;
  const intConfirmed = Array.isArray(intRaw) ? intRaw.filter(Boolean).join(", ") : (typeof intRaw === "string" ? intRaw : null);
  const intQ = qMap.get("integrations");

  // 6. Commercial
  const commAns = answers["commercial"];
  const commRaw = (commAns?.["budgetRange"] ?? commAns?.["pricingModel"] ?? commAns?.["budget"]) as unknown;
  const commConfirmed = typeof commRaw === "string" && commRaw.trim() ? commRaw.trim() : null;
  const commQ = qMap.get("commercial");

  // 7. Business Objective
  const bizAns = answers["business"];
  const bizRaw = (bizAns?.["problem"] ?? bizAns?.["objective"] ?? bizAns?.["vision"]) as unknown;
  const bizConfirmed = typeof bizRaw === "string" && bizRaw.trim() ? bizRaw.trim() : null;
  const bizQ = qMap.get("business");

  // 8. Success Criteria
  const succAns = answers["successCriteria"];
  const succRaw = (succAns?.["kpi"] ?? succAns?.["metrics"] ?? succAns?.["criteria"]) as unknown;
  const succConfirmed = typeof succRaw === "string" && succRaw.trim() ? succRaw.trim() : null;
  const succQ = qMap.get("successCriteria");

  const items: ReviewQueueItem[] = [
    {
      id: "rq-users",
      key: "users",
      category: "Users & Roles",
      title: "Who will use the platform?",
      whyWeNeedThis: "Determines user roles, access control matrices, and permission architecture.",
      status: usersConfirmed ? "CONFIRMED" : usersQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: usersConfirmed,
      suggestedQuestion: "Who are the primary people or roles that will use the platform?",
      responseType: "MULTI_SELECT",
      options: ["Business Administrators", "Managers", "Employees", "Clients / Customers", "Vendors / Partners", "System Operators"],
    },
    {
      id: "rq-scope",
      key: "scope",
      category: "Scope & Boundaries",
      title: "What should be included in Version 1?",
      whyWeNeedThis: "Sets clear project boundaries and prevents premature scope creep before proposal finalization.",
      status: scopeConfirmed ? "CONFIRMED" : scopeQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: scopeConfirmed,
      suggestedQuestion: "What core capabilities are strictly required for Version 1 launch?",
      responseType: "LONG_TEXT",
      options: [],
    },
    {
      id: "rq-features",
      key: "features",
      category: "Features & Capabilities",
      title: "Confirm essential capabilities",
      whyWeNeedThis: "Defines engineering deliverables, team allocation, and architectural work packages.",
      status: featuresConfirmed ? "CONFIRMED" : featuresQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: featuresConfirmed,
      suggestedQuestion: "Which specific modules or capability sets are mandatory for the first release?",
      responseType: "MULTI_SELECT",
      options: ["Client & Lead Management", "Project & Task Execution", "Financial & Invoicing Engine", "Custom Dashboards & Analytics", "Automated Workflows & Alerts", "Document & Asset Management"],
    },
    {
      id: "rq-timeline",
      key: "timeline",
      category: "Target Timeline",
      title: "Target delivery timeframe",
      whyWeNeedThis: "Required to construct realistic sprint schedules and assign developer capacity.",
      status: timelineConfirmed ? "CONFIRMED" : timelineQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: timelineConfirmed,
      suggestedQuestion: "What is your target launch or deployment timeframe for Version 1?",
      responseType: "SINGLE_SELECT",
      options: ["1–2 months (Fast track)", "2–4 months (Standard)", "4–6 months (Enterprise)", "Flexible based on scope"],
    },
    {
      id: "rq-integrations",
      key: "integrations",
      category: "External Integrations",
      title: "Third-party systems & APIs",
      whyWeNeedThis: "Determines API authentication, webhook overhead, and external dependencies.",
      status: intConfirmed ? "CONFIRMED" : intQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: intConfirmed,
      suggestedQuestion: "Which third-party services, APIs, or legacy databases must integrate with the platform?",
      responseType: "MULTI_SELECT",
      options: ["Payment Gateways (Stripe / Razorpay)", "Email / SMS (Resend / Twilio)", "GitHub / Code Repositories", "Google Workspace / Outlook", "Accounting (Zoho / QuickBooks)", "None (Standalone)"],
    },
    {
      id: "rq-commercial",
      key: "commercial",
      category: "Commercial & Budget",
      title: "Commercial engagement structure",
      whyWeNeedThis: "Aligns proposal pricing model (fixed milestone vs dedicated team) with client expectations.",
      status: commConfirmed ? "CONFIRMED" : commQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: commConfirmed,
      suggestedQuestion: "What budget tier or commercial engagement model do you prefer?",
      responseType: "SINGLE_SELECT",
      options: ["Seed / Prototype (₹3L–₹8L)", "Growth / Production (₹8L–₹20L)", "Enterprise Custom (>₹20L)", "To be advised by agency"],
    },
    {
      id: "rq-business",
      key: "business",
      category: "Business Objective",
      title: "Core business objective",
      whyWeNeedThis: "Ensures the technical design directly serves the client's strategic business objective.",
      status: bizConfirmed ? "CONFIRMED" : bizQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: bizConfirmed,
      suggestedQuestion: "What is the primary business outcome or operational bottleneck this platform will solve?",
      responseType: "LONG_TEXT",
      options: [],
    },
    {
      id: "rq-successCriteria",
      key: "successCriteria",
      category: "Success Criteria",
      title: "Deployment acceptance criteria",
      whyWeNeedThis: "Establishes measurable criteria for sign-off, client satisfaction, and final release.",
      status: succConfirmed ? "CONFIRMED" : succQ?.status === "SENT" ? "MISSING" : "REQUIRED",
      currentAnswer: succConfirmed,
      suggestedQuestion: "What 2–3 key indicators will signify a successful rollout for your organization?",
      responseType: "LONG_TEXT",
      options: [],
    },
  ];

  return items;
}

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

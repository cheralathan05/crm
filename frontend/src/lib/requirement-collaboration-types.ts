/**
 * Business OS — Requirement Collaboration: Browser-Safe Types & Pure Helpers
 *
 * This file is BROWSER-SAFE. It contains ZERO imports from db, prisma,
 * nodemailer, or any Node.js-only module. It can be safely imported by
 * Client Components, Server Components, and API routes.
 */

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

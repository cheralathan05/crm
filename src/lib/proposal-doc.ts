/* ────────────────────────────────────────────────────────────────
   PROPOSAL DOCUMENT — PURE TYPES & HELPERS
   No server-only imports — safe to share between the API layer and
   the Proposal Studio client component. All functions are pure.

   The document is a structured block model, never raw HTML. Every
   block is typed, addressable (id), and can carry its provenance
   (source + sourceRequirementIds) so proposal facts stay traceable
   to the approved requirement. Section groups (OVERVIEW / SOLUTION /
   DELIVERY / COMMERCIAL / CLOSING) organize the navigator, and the
   coverage/readiness functions are derived deterministically from
   the real data — never fabricated.
──────────────────────────────────────────────────────────────── */

export type FeatureIntelligence = {
  title: string;
  purpose: string;
  businessNeed?: string;
  primaryUsers?: string;
  capabilities: string[];
  userFlow?: string;
  inputs?: string;
  outputs?: string;
  systemBehavior?: string;
  dataCaptured?: string;
  dependencies?: string[];
  expectedOutcome?: string;
  acceptanceCriteria?: string[];
  requirementSource?: string;
  aiConfidence?: number;
  priority: string;
  users: string;
  status: string;
};

export type ObjectiveIntelligence = {
  title: string;
  businessNeed?: string;
  whyItMatters?: string;
  currentState?: string;
  desiredState?: string;
  expectedOutcome?: string;
  successIndicator: string;
  requirement: string;
  description: string;
};

export type ArchitectureLayer = {
  name: string;
  tech: string;
  purpose?: string;
  status?: string;
};

export type ProblemSolutionComparison = {
  title?: string;
  currentState: { problem: string; impact: string };
  proposedState: { solution: string; outcome: string };
  businessNeed?: string;
};

export type DigitalApproval = {
  clientName?: string;
  projectName?: string;
  version?: number;
  approvedScope?: string;
  acceptanceDate?: string;
  authorizedPerson?: string;
  digitalStamp?: string;
  status?: string;
};

export type ProposalBlockShape =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | ({ type: "feature_card" } & FeatureIntelligence)
  | ({ type: "objective_card" } & ObjectiveIntelligence)
  | { type: "callout"; title: string; text: string; tone: "info" | "warning" | "success" }
  | { type: "statistic"; label: string; value: string; detail?: string }
  | { type: "process_flow"; steps: string[] }
  | { type: "timeline"; phases: { title: string; description: string; duration?: string }[] }
  | { type: "milestone"; title: string; description: string; date?: string; status?: string }
  | { type: "deliverable"; id: string; name: string; description: string; status: string; scope?: string; output?: string; acceptance?: string; source?: string }
  | { type: "requirement_reference"; reference: string; title: string; status?: string; details?: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "architecture"; title?: string; layers: ArchitectureLayer[] }
  | { type: "comparison" } & ProblemSolutionComparison
  | { type: "pricing_table"; headers: string[]; rows: string[][]; total?: string; milestones?: { name: string; amount: string; schedule: string }[] }
  | { type: "assumption"; id: string; description: string; owner?: string; impact?: string; status?: string; source?: string }
  | { type: "risk"; title: string; description: string; impact?: string; probability?: string; mitigation?: string; owner?: string; status?: string; aiDerived?: boolean }
  | { type: "signature"; role: "CLIENT" | "PROVIDER"; name?: string; title?: string; date?: string; signatureUrl?: string }
  | ({ type: "approval" } & DigitalApproval)
  | { type: "page_break" }
  | { type: "spacer" };

export type ProposalBlock = ProposalBlockShape & Partial<BlockMeta>;

/** Provenance metadata attached to every block — what fact it came from. */
export type BlockMeta = {
  id?: string;
  source?: ProposalSource;
  sourceRequirementIds?: string[];
  sourceRequirementVersion?: number;
  sourceSnapshotId?: string;
  sourceClientResponseIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  version?: number;
};

export type ProposalSource = "REQUIREMENT" | "CLIENT" | "WORKSPACE" | "MANUAL" | "AI_DRAFT";

export type SectionStatus = "DRAFT" | "READY" | "REVIEW_REQUIRED" | "AI_ENHANCED";

export type InternalNote = {
  id: string;
  content: string;
  authorName?: string;
  createdAt: string;
};

export type SectionComment = {
  id: string;
  sectionId: string;
  authorName: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
};

export type ProposalSection = {
  id: string;
  number: string;
  title: string;
  kicker: string;
  source: ProposalSource;
  visible: boolean;
  blocks: ProposalBlock[];
  /** Navigator group — OVERVIEW / SOLUTION / DELIVERY / COMMERCIAL / CLOSING. */
  group?: string;
  status?: SectionStatus;
  updatedAt?: string;
  notes?: string;
};

export type ProposalAdminAnswer = {
  id: string;
  sectionId: string;
  questionId: string;
  question: string;
  answer: string;
  category: "REQUIRED" | "OPTIONAL";
  source: "ADMIN_PROVIDED" | "CLIENT_PROVIDED" | "REQUIREMENT_PROVIDED";
  createdAt: string;
  updatedAt: string;
};

export type ProposalContextFact = {
  id: string;
  category: "BUSINESS_CONTEXT" | "SCOPE" | "TECHNICAL" | "TIMELINE" | "DELIVERABLE" | "COMMERCIAL";
  key: string;
  value: string;
  source: "ADMIN_PROVIDED" | "CLIENT_PROVIDED" | "REQUIREMENT_APPROVED" | "WORKSPACE_PROVIDED";
  approved: boolean;
  createdAt: string;
};

export type ProposalDoc = {
  version: number;
  meta: {
    reference: string;
    title: string;
    clientName: string;
    preparedBy: string;
    preparedFor: string | null;
    amount: number | null;
    currency: string;
    amountLabel: string;
    timelineLabel: string;
    date: string;
  };
  sections: ProposalSection[];
  internalNotes?: InternalNote[];
  comments?: SectionComment[];
  adminAnswers?: ProposalAdminAnswer[];
  facts?: ProposalContextFact[];
};

export const SOURCE_LABELS: Record<ProposalSource, string> = {
  REQUIREMENT: "Approved requirement",
  CLIENT: "Client record",
  WORKSPACE: "Workspace",
  MANUAL: "Manual",
  AI_DRAFT: "AI draft",
};

/* ── Section groups (spec 04) ─────────────────────────────────── */

export const SECTION_GROUPS = [
  { key: "OVERVIEW", label: "Overview" },
  { key: "SOLUTION", label: "Solution" },
  { key: "DELIVERY", label: "Delivery" },
  { key: "COMMERCIAL", label: "Commercial" },
  { key: "CLOSING", label: "Closing" },
] as const;

export type SectionGroupKey = (typeof SECTION_GROUPS)[number]["key"];

/** Default group for the known template section ids. */
export const DEFAULT_SECTION_GROUP: Record<string, SectionGroupKey> = {
  cover: "OVERVIEW",
  contents: "OVERVIEW",
  "executive-summary": "OVERVIEW",
  overview: "OVERVIEW",
  objectives: "OVERVIEW",
  comparison: "OVERVIEW",
  scope: "SOLUTION",
  features: "SOLUTION",
  deliverables: "SOLUTION",
  architecture: "SOLUTION",
  ux: "SOLUTION",
  methodology: "SOLUTION",
  timeline: "DELIVERY",
  "activity-plan": "DELIVERY",
  roles: "DELIVERY",
  communication: "DELIVERY",
  investment: "COMMERCIAL",
  assumptions: "COMMERCIAL",
  terms: "COMMERCIAL",
  risks: "CLOSING",
  contact: "CLOSING",
  acceptance: "CLOSING",
  closing: "CLOSING",
};

export function sectionGroupKey(s: ProposalSection): SectionGroupKey {
  return (s.group as SectionGroupKey) ?? DEFAULT_SECTION_GROUP[s.id] ?? "CLOSING";
}

export function groupLabel(key: string): string {
  return SECTION_GROUPS.find((g) => g.key === key)?.label ?? key;
}

/* ── Block helpers ────────────────────────────────────────────── */

export function blockId(b: ProposalBlock, fallback: string): string {
  return b.id ?? fallback;
}

/** Human-readable text of a block — used for search + requirement coverage. */
export function blockText(b: ProposalBlock): string {
  switch (b.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return b.text;
    case "list":
    case "process_flow":
      return ("items" in b ? (b as { items: string[] }).items : (b as { steps: string[] }).steps).join(" ");
    case "table":
    case "pricing_table":
      return [...(b.headers ?? []), ...b.rows.flat().filter(Boolean)].join(" ");
    case "feature_card":
      return [
        b.title,
        b.purpose,
        b.businessNeed,
        b.primaryUsers,
        b.users,
        b.userFlow,
        b.expectedOutcome,
        ...(b.capabilities ?? []),
        ...(b.acceptanceCriteria ?? []),
      ]
        .filter(Boolean)
        .join(" ");
    case "objective_card":
      return [
        b.title,
        b.description,
        b.businessNeed,
        b.whyItMatters,
        b.currentState,
        b.desiredState,
        b.expectedOutcome,
        b.successIndicator,
        b.requirement,
      ]
        .filter(Boolean)
        .join(" ");
    case "callout":
      return [b.title, b.text].filter(Boolean).join(" ");
    case "statistic":
      return [b.label, b.value, b.detail].filter(Boolean).join(" ");
    case "timeline":
      return b.phases.map((p) => [p.title, p.description, p.duration].filter(Boolean).join(" ")).join(" ");
    case "milestone":
      return [b.title, b.description, b.date].filter(Boolean).join(" ");
    case "deliverable":
      return [b.id, b.name, b.description, b.scope, b.output, b.acceptance].filter(Boolean).join(" ");
    case "requirement_reference":
      return [b.reference, b.title, b.details].filter(Boolean).join(" ");
    case "architecture":
      return b.layers.map((l) => [l.name, l.tech, l.purpose].filter(Boolean).join(" ")).join(" ");
    case "comparison":
      return [
        b.title,
        b.businessNeed,
        b.currentState?.problem,
        b.currentState?.impact,
        b.proposedState?.solution,
        b.proposedState?.outcome,
      ]
        .filter(Boolean)
        .join(" ");
    case "assumption":
      return [b.id, b.description, b.owner, b.impact].filter(Boolean).join(" ");
    case "risk":
      return [b.title, b.description, b.impact, b.probability, b.mitigation, b.owner].filter(Boolean).join(" ");
    case "signature":
      return [b.name, b.title, b.role, b.date].filter(Boolean).join(" ");
    case "approval":
      return [b.clientName, b.projectName, b.approvedScope, b.authorizedPerson, b.digitalStamp].filter(Boolean).join(" ");
    default:
      return "";
  }
}

/** Does the block carry any real content? Empty scaffold blocks are treated
    as absent so completion/readiness numbers are honest. */
export function blockHasContent(b: ProposalBlock): boolean {
  switch (b.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return b.text.trim().length > 0;
    case "list":
    case "process_flow": {
      const items = ("items" in b ? (b as { items: string[] }).items : (b as { steps: string[] }).steps) ?? [];
      return items.some((x) => String(x).trim().length > 0);
    }
    case "table":
    case "pricing_table":
      return b.rows.some((r) => r.some((c) => String(c).trim().length > 0));
    case "feature_card":
      return b.title.trim().length > 0;
    case "objective_card":
      return b.title.trim().length > 0 || (b.description ?? "").trim().length > 0;
    case "callout":
      return b.text.trim().length > 0;
    case "statistic":
      return b.value.trim().length > 0;
    case "timeline":
      return b.phases.length > 0;
    case "milestone":
      return b.title.trim().length > 0;
    case "deliverable":
      return b.name.trim().length > 0;
    case "requirement_reference":
      return b.reference.trim().length > 0 || b.title.trim().length > 0;
    case "architecture":
      return b.layers.length > 0 && b.layers.some((l) => l.name.trim().length > 0);
    case "comparison":
      return Boolean(b.currentState?.problem || b.proposedState?.solution);
    case "assumption":
      return b.description.trim().length > 0;
    case "risk":
      return b.title.trim().length > 0 || b.description.trim().length > 0;
    case "signature":
      return Boolean(b.name) || Boolean(b.title);
    case "approval":
      return Boolean(b.authorizedPerson) || Boolean(b.clientName);
    case "page_break":
    case "spacer":
      return true;
  }
}

/** Section completion — share of content-bearing blocks (spec: navigator %). */
export function sectionCompletion(s: ProposalSection): number {
  if (s.blocks.length === 0) return 0;
  const done = s.blocks.filter(blockHasContent).length;
  return Math.round((done / s.blocks.length) * 100);
}

export function hasContent(s: ProposalSection): boolean {
  return s.blocks.some(blockHasContent);
}

/** Derived section status — from real state, never hardcoded. */
export function deriveSectionStatus(s: ProposalSection): SectionStatus {
  if (s.source === "AI_DRAFT") return "AI_ENHANCED";
  if (!hasContent(s)) return "DRAFT";
  if (sectionCompletion(s) < 100) return "REVIEW_REQUIRED";
  return "READY";
}

/** Deterministic id for a block based on its position — used as the initial
    key when old documents (without ids) are loaded. */
export function blockFallbackId(sectionId: string, index: number): string {
  return `${sectionId}-b${index}`;
}

/** Normalize a document loaded from storage: backfill group/status on
    sections and stable ids + source on blocks. Idempotent and pure. */
export function normalizeDoc(doc: ProposalDoc): ProposalDoc {
  const sections = doc.sections.map((s) => {
    const blocks = s.blocks.map((b, j) => {
      const withId = { ...b, id: b.id ?? blockFallbackId(s.id, j) } as ProposalBlock;
      if (!withId.source) withId.source = s.source;
      if (!withId.updatedAt) withId.updatedAt = doc.meta.date ?? new Date().toISOString();
      return withId;
    });
    return {
      ...s,
      blocks,
      group: s.group ?? DEFAULT_SECTION_GROUP[s.id] ?? "CLOSING",
      status: s.status ?? deriveSectionStatus({ ...s, blocks }),
    };
  });
  return {
    ...doc,
    sections,
    internalNotes: doc.internalNotes ?? [],
    comments: doc.comments ?? [],
    adminAnswers: doc.adminAnswers ?? [],
    facts: doc.facts ?? [],
  };
}

/** Converts AI generated detailed proposal text into structured ProposalBlocks */
export function parseGeneratedTextToBlocks(rawText: string, sectionId: string): ProposalBlock[] {
  const text = rawText.trim();
  if (!text) return [];

  const lines = text.split("\n");
  const blocks: ProposalBlock[] = [];
  const now = new Date().toISOString();

  let currentList: { ordered: boolean; items: string[] } | null = null;
  let currentParagraph: string[] = [];
  let blockIdx = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const pText = currentParagraph.join(" ").trim();
      if (pText) {
        blockIdx++;
        blocks.push({
          type: "paragraph",
          id: `${sectionId}-p-${Date.now().toString(36)}-${blockIdx}`,
          text: pText,
          source: "AI_DRAFT",
          updatedAt: now,
        });
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blockIdx++;
      blocks.push({
        type: "list",
        id: `${sectionId}-l-${Date.now().toString(36)}-${blockIdx}`,
        items: currentList.items,
        ordered: currentList.ordered,
        source: "AI_DRAFT",
        updatedAt: now,
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // 1. Markdown Headings (# Heading, ## Heading, ### Heading)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blockIdx++;
      const level = Math.min(3, Math.max(1, headingMatch[1].length)) as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        id: `${sectionId}-h-${Date.now().toString(36)}-${blockIdx}`,
        text: headingMatch[2].replace(/\*\*/g, "").trim(),
        level,
        source: "AI_DRAFT",
        updatedAt: now,
      });
      continue;
    }

    // 2. Bold Section Titles (e.g. **1. Company Overview** or **Executive Summary:** or **Key Capabilities**)
    const boldHeaderMatch = trimmed.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (boldHeaderMatch && trimmed.length < 80) {
      flushParagraph();
      flushList();
      blockIdx++;
      blocks.push({
        type: "heading",
        id: `${sectionId}-h-${Date.now().toString(36)}-${blockIdx}`,
        text: boldHeaderMatch[1].trim(),
        level: 2,
        source: "AI_DRAFT",
        updatedAt: now,
      });
      continue;
    }

    // 3. Callout / Quote (> text)
    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      blockIdx++;
      blocks.push({
        type: "callout",
        id: `${sectionId}-c-${Date.now().toString(36)}-${blockIdx}`,
        title: "Key Strategy",
        text: trimmed.replace(/^>\s*/, "").trim(),
        tone: "info",
        source: "AI_DRAFT",
        updatedAt: now,
      });
      continue;
    }

    // 4. Bullet / Numbered Lists (- item, • item, * item, 1. item)
    const listMatch = trimmed.match(/^([-•*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const isOrdered = /^\d+\./.test(listMatch[1]);
      if (!currentList || currentList.ordered !== isOrdered) {
        flushList();
        currentList = { ordered: isOrdered, items: [] };
      }
      currentList.items.push(listMatch[2].trim());
      continue;
    }

    // 5. Normal text paragraph line
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/* ── Coverage + readiness (spec 20, 21) ───────────────────────── */

export type RequirementFeatureRef = { name: string; priority: string; status?: string };

export type RequirementCoverage = {
  percent: number;
  total: number;
  represented: number;
  uncovered: string[];
};

/**
 * Requirement coverage — how many approved requirement features are
 * represented somewhere in the proposal document. Honest: only real
 * feature names count, matched against feature cards and any text.
 */
export function computeRequirementCoverage(doc: ProposalDoc, features: RequirementFeatureRef[]): RequirementCoverage {
  if (features.length === 0) return { percent: 100, total: 0, represented: 0, uncovered: [] };

  const docText = doc.sections
    .filter((s) => s.visible)
    .flatMap((s) => s.blocks)
    .map(blockText)
    .join(" \u0000 ")
    .toLowerCase();

  const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const haystack = normalized(docText);

  const represented = features.filter((f) => {
    const name = normalized(f.name);
    if (!name) return false;
    if (name.length <= 3) return haystack.includes(name);
    return haystack.includes(name) || haystack.includes(name.replace(/[^a-z0-9]+/g, ""));
  }).length;

  const uncovered = features
    .filter((f) => {
      const name = normalized(f.name);
      if (!name) return false;
      if (name.length <= 3) return !haystack.includes(name);
      return !haystack.includes(name) && !haystack.includes(name.replace(/[^a-z0-9]+/g, ""));
    })
    .map((f) => f.name);

  return {
    percent: Math.round((represented / features.length) * 100),
    total: features.length,
    represented,
    uncovered,
  };
}

export type ReadinessArea = { key: string; label: string; ok: boolean; note: string };
export type ProposalReadiness = { percent: number; areas: ReadinessArea[] };

/** Full readiness model — real sub-scores the studio and finalization use. */
export function computeProposalReadiness(doc: ProposalDoc, coverage?: RequirementCoverage): ProposalReadiness {
  const visible = doc.sections.filter((s) => s.visible);

  const areas: ReadinessArea[] = [];

  areas.push({
    key: "content",
    label: "Content",
    ok: visible.filter(hasContent).length >= Math.max(4, Math.ceil(visible.length / 2)),
    note: `${visible.filter(hasContent).length} of ${visible.length} sections have content`,
  });

  const cov = coverage ?? computeRequirementCoverage(doc, []);
  areas.push({
    key: "coverage",
    label: "Requirement coverage",
    ok: cov.total === 0 || cov.percent >= 90,
    note: cov.total === 0 ? "No approved requirement features to cover" : `${cov.percent}% of ${cov.total} features represented`,
  });

  areas.push({
    key: "client",
    label: "Client information",
    ok: Boolean(doc.meta.clientName) && Boolean(doc.meta.preparedFor ?? doc.meta.clientName),
    note: doc.meta.clientName ? `Prepared for ${doc.meta.clientName}` : "Client name is missing",
  });

  const scope = doc.sections.find((s) => s.id === "scope");
  areas.push({
    key: "scope",
    label: "Scope",
    ok: Boolean(scope && hasContent(scope)),
    note: scope && hasContent(scope) ? "Scope carries requirement data" : "Scope is empty",
  });

  const deliverables = doc.sections.find((s) => s.id === "deliverables" || s.id === "features");
  areas.push({
    key: "deliverables",
    label: "Deliverables",
    ok: Boolean(deliverables && hasContent(deliverables)),
    note: deliverables && hasContent(deliverables) ? "Deliverables defined" : "Add the deliverables",
  });

  const investment = doc.sections.find((s) => s.id === "investment");
  areas.push({
    key: "commercial",
    label: "Commercials",
    ok: doc.meta.amount !== null || (Boolean(investment) && hasContent(investment!)),
    note: doc.meta.amount !== null ? doc.meta.amountLabel : "Set the investment amount",
  });

  const terms = doc.sections.find((s) => s.id === "terms");
  areas.push({
    key: "terms",
    label: "Terms",
    ok: Boolean(terms && hasContent(terms)),
    note: terms && hasContent(terms) ? "Terms confirmed" : "Confirm terms before sending",
  });

  const percent = Math.round((areas.filter((a) => a.ok).length / areas.length) * 100);
  return { percent, areas };
}

/** Deterministic, explainable quality score — mirrors the server version. */
export function computeProposalQuality(doc: ProposalDoc): {
  total: number;
  items: { label: string; ok: boolean; note: string }[];
} {
  const visible = doc.sections.filter((s) => s.visible);

  const items: { label: string; ok: boolean; note: string }[] = [];
  items.push({
    label: "Content",
    ok: visible.filter(hasContent).length >= Math.max(4, Math.ceil(visible.length / 2)),
    note: `${visible.filter(hasContent).length} of ${visible.length} sections have content`,
  });
  items.push({
    label: "Branding",
    ok: !!doc.meta.preparedBy && !!doc.meta.clientName,
    note: doc.meta.preparedBy ? `Prepared by ${doc.meta.preparedBy}` : "Add your company name",
  });
  items.push({
    label: "Scope",
    ok: (() => {
      const s = doc.sections.find((x) => x.id === "scope");
      return !!s && hasContent(s);
    })(),
    note: "Scope carries requirement data",
  });
  items.push({
    label: "Pricing",
    ok: doc.meta.amount !== null,
    note: doc.meta.amount !== null ? doc.meta.amountLabel : "Set the investment amount",
  });
  items.push({
    label: "Timeline",
    ok: !!doc.meta.timelineLabel && doc.meta.timelineLabel !== "To be discussed",
    note: doc.meta.timelineLabel || "Add the timeline",
  });
  items.push({
    label: "Terms",
    ok: (() => {
      const s = doc.sections.find((x) => x.id === "terms");
      return !!s && hasContent(s);
    })(),
    note: "Confirm terms before sending",
  });

  const total = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { total, items };
}

/* ── Money helpers ────────────────────────────────────────────── */

/** Upper bound of a budget range string ("₹1L – ₹3L" → 3_00_000). */
export function estimateBudgetAmount(budgetRange: string): number | null {
  const parts = budgetRange.split(/[\u2013\u2014\-–—]/);
  const lastWithDigits = [...parts].reverse().find((p) => /\d/.test(p));
  if (!lastWithDigits) return null;
  const match = lastWithDigits.match(/(\d+(?:\.\d+)?)\s*[LK]/);
  if (!match) return null;
  const raw = Number(match[1]);
  return match[0].toUpperCase().includes("L") ? raw * 100_000 : raw * 1_000;
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function amountLabel(amount: number | null): string {
  if (amount === null) return "To be confirmed";
  return formatINR(amount);
}

export function timelineLabel(answers: Record<string, Record<string, unknown>>): string {
  const t = answers.timeline ?? {};
  const launch = String(t.launchWindow ?? "");
  const deadline = String(t.deadlineDate ?? "");
  if (launch && deadline) return `${launch} · fixed ${deadline}`;
  return launch || "To be discussed";
}

/* ── Version Comparison (Spec 42) ────────────────────────────── */

export type SectionDiff = {
  id: string;
  title: string;
  status: "added" | "removed" | "modified" | "unchanged";
  addedBlocks: number;
  removedBlocks: number;
  wordsDiff: number;
};

export type ProposalVersionDiff = {
  versionA: number;
  versionB: number;
  sectionsAdded: number;
  sectionsRemoved: number;
  sectionsModified: number;
  totalWordsA: number;
  totalWordsB: number;
  wordsDiff: number;
  commercialChanged: boolean;
  scopeChanged: boolean;
  sectionDiffs: SectionDiff[];
};

export function diffProposalDocs(docA: ProposalDoc, docB: ProposalDoc): ProposalVersionDiff {
  const countWords = (d: ProposalDoc) =>
    d.sections.reduce((n, s) => n + s.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0), 0);

  const wordsA = countWords(docA);
  const wordsB = countWords(docB);

  const mapA = new Map(docA.sections.map((s) => [s.id, s]));
  const mapB = new Map(docB.sections.map((s) => [s.id, s]));

  const allIds = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));
  const sectionDiffs: SectionDiff[] = [];

  let sectionsAdded = 0;
  let sectionsRemoved = 0;
  let sectionsModified = 0;

  for (const id of allIds) {
    const sA = mapA.get(id);
    const sB = mapB.get(id);

    if (!sA && sB) {
      sectionsAdded++;
      const w = sB.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0);
      sectionDiffs.push({ id, title: sB.title, status: "added", addedBlocks: sB.blocks.length, removedBlocks: 0, wordsDiff: w });
    } else if (sA && !sB) {
      sectionsRemoved++;
      const w = sA.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0);
      sectionDiffs.push({ id, title: sA.title, status: "removed", addedBlocks: 0, removedBlocks: sA.blocks.length, wordsDiff: -w });
    } else if (sA && sB) {
      const textA = sA.blocks.map(blockText).join(" ");
      const textB = sB.blocks.map(blockText).join(" ");
      if (textA !== textB || sA.blocks.length !== sB.blocks.length || sA.title !== sB.title) {
        sectionsModified++;
        const wA = sA.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0);
        const wB = sB.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0);
        sectionDiffs.push({
          id,
          title: sB.title,
          status: "modified",
          addedBlocks: Math.max(0, sB.blocks.length - sA.blocks.length),
          removedBlocks: Math.max(0, sA.blocks.length - sB.blocks.length),
          wordsDiff: wB - wA,
        });
      } else {
        sectionDiffs.push({ id, title: sB.title, status: "unchanged", addedBlocks: 0, removedBlocks: 0, wordsDiff: 0 });
      }
    }
  }

  const commercialChanged = docA.meta.amount !== docB.meta.amount || docA.meta.amountLabel !== docB.meta.amountLabel;
  const scopeA = mapA.get("scope")?.blocks.map(blockText).join(" ") ?? "";
  const scopeB = mapB.get("scope")?.blocks.map(blockText).join(" ") ?? "";
  const scopeChanged = scopeA !== scopeB;

  return {
    versionA: docA.version,
    versionB: docB.version,
    sectionsAdded,
    sectionsRemoved,
    sectionsModified,
    totalWordsA: wordsA,
    totalWordsB: wordsB,
    wordsDiff: wordsB - wordsA,
    commercialChanged,
    scopeChanged,
    sectionDiffs,
  };
}

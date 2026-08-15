/* ────────────────────────────────────────────────────────────────
   REQUIREMENT INTELLIGENCE — DERIVED, NEVER INVENTED
   Everything in this module is computed from the requirement's real
   stored data (section answers, features, clarification questions,
   conflicts, revisions). It answers the questions the workspace asks
   constantly:

     WHAT IS REQUIRED · OPTIONAL · COMPLETE · MISSING
     WHAT IS BLOCKING · WHAT ARE WE WAITING FOR · WHAT CHANGED
     CAN WE APPROVE · CAN WE GENERATE THE PROPOSAL · WHAT NEXT

   The classification is derived deterministically from the data — a
   feature the client marked MUST_HAVE is REQUIRED, an unconfigured
   required item is ACTION REQUIRED, an empty optional item is normal.
   No mock data, no fabricated percentages, no fake intelligence.
──────────────────────────────────────────────────────────────── */

import { SECTIONS, getSection } from "./requirement-config";

/* ── Input shapes (the admin bundle's real data) ─────────────── */

export type IntelRequest = {
  id: string;
  status: string;
  title: string;
  revision: number;
  completeness: number;
  readiness: number;
};

export type IntelClient = { id: string; companyName: string } | null;

export type IntelAnswerMap = Record<string, Record<string, unknown>>;

export type IntelFeature = {
  id: string;
  name: string;
  priority: string; // MUST_HAVE | SHOULD_HAVE | NICE_TO_HAVE
  description: string;
  config: Record<string, unknown>;
  acceptanceCriteria: string[];
};

export type IntelQuestion = {
  id: string;
  section: string;
  sectionLabel: string;
  categoryLabel: string | null;
  clientQuestion: string;
  isBlocking: boolean;
  status: string;
  recipientName: string;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export type IntelConflict = { id: string; description: string; detail: string | null };

export type IntelInput = {
  request: IntelRequest;
  client: IntelClient;
  answers: IntelAnswerMap;
  features: IntelFeature[];
  states: Record<string, boolean>;
  questions: IntelQuestion[];
  conflicts: IntelConflict[];
  proposalBlock: { blocked: boolean; blockers: { id: string; label: string; category: string }[] };
  revisions?: { revision: number; changes: string[] }[];
};

/* ── Output model ────────────────────────────────────────────── */

export type ItemMode = "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE";
export type ItemStatus =
  | "CONFIRMED"      // real value present and reviewed/confirmed
  | "ACTION_REQUIRED" // required + missing
  | "IN_REVIEW"       // provided, awaiting admin review
  | "WAITING"         // clarification sent, awaiting the client
  | "OPTIONAL"        // optional + empty — normal, never an error

export type IntelItem = {
  id: string;
  label: string;
  detail: string;
  mode: ItemMode;
  status: ItemStatus;
  source: string;
  section?: string;
  questionId?: string | null;
  why?: string;
};

export type Blocker = {
  kind: "item" | "clarification";
  id: string;
  label: string;
  section?: string;
  questionId?: string;
};

export type ReadinessRow = { key: string; label: string; ok: boolean; note: string };
export type NextAction =
  | { kind: "send"; text: string }
  | { kind: "review-question"; text: string; questionId: string }
  | { kind: "waiting"; text: string }
  | { kind: "ask"; text: string; section: string }
  | { kind: "resolve-conflict"; text: string }
  | { kind: "review"; text: string }
  | { kind: "approve"; text: string }
  | { kind: "proposal"; text: string }
  | { kind: "none"; text: string };

export type Intel = {
  items: IntelItem[];
  required: IntelItem[];
  optional: IntelItem[];
  notApplicable: IntelItem[];
  blockers: Blocker[];
  pendingCount: number;
  requiredDone: number;
  requiredTotal: number;
  completion: { required: number; optional: number; blocking: number };
  health: { level: "GOOD" | "WATCH" | "AT_RISK" | "BLOCKED"; reason: string };
  readiness: { ok: boolean; percent: number; rows: ReadinessRow[] };
  nextAction: NextAction;
  known: { label: string; value: string; source: string }[];
  waitingOnClient: { questionId: string; label: string; recipient: string; section: string; since: string }[];
  needsReview: { questionId: string; label: string; section: string }[];
  changed: string[];
};

/* ── Status vocabulary (spec 98) ─────────────────────────────── */

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  CONFIRMED: "Confirmed",
  ACTION_REQUIRED: "Action required",
  IN_REVIEW: "In review",
  WAITING: "Waiting on client",
  OPTIONAL: "Optional",
};

export const ITEM_MODE_LABEL: Record<ItemMode, string> = {
  REQUIRED: "Required",
  OPTIONAL: "Optional",
  NOT_APPLICABLE: "Not applicable",
};

/* ── Helpers ─────────────────────────────────────────────────── */

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}
function listLen(v: unknown): number {
  return Array.isArray(v) ? v.filter(Boolean).length : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The weighted critical sections are the required items of the requirement. */
export const REQUIRED_SECTION_KEYS = SECTIONS.filter((s) => s.weight > 0).map((s) => s.key);

function sectionItem(id: string, key: string, label: string, complete: boolean, source: string): IntelItem {
  return {
    id,
    label,
    detail: complete ? "Provided by the client" : "No information provided yet",
    mode: "REQUIRED",
    status: complete ? "CONFIRMED" : "ACTION_REQUIRED",
    source,
    section: key,
  };
}

/** A feature the client picked — REQUIRED only when marked MUST_HAVE. */
function featureItem(f: IntelFeature): IntelItem {
  const required = f.priority === "MUST_HAVE";
  const configured = hasText(f.description) || Object.keys(f.config ?? {}).length > 0 || f.acceptanceCriteria.length > 0;
  const mode: ItemMode = required ? "REQUIRED" : "OPTIONAL";
  return {
    id: `feature-${f.id}`,
    label: f.name,
    detail: required
      ? configured
        ? "Selected as a must-have and configured"
        : "Selected as a must-have but not configured"
      : configured
        ? "Optional feature the client provided details for"
        : "Optional — no action required",
    mode,
    status: required ? (configured ? "CONFIRMED" : "ACTION_REQUIRED") : configured ? "CONFIRMED" : "OPTIONAL",
    source: "Client form",
    section: "features",
    why: required
      ? "The client selected this as a must-have for the project."
      : "The client did not mark this as a must-have — it does not gate approval.",
  };
}

/* ── The engine ──────────────────────────────────────────────── */

/** The latest revision's human-readable changes — what actually changed. */
export function latestChanges(revisions: { revision: number; changes: string[] }[]): string[] {
  if (revisions.length === 0) return [];
  const latest = [...revisions].sort((a, b) => b.revision - a.revision)[0];
  return latest.revision === 1 ? [] : latest.changes;
}

export function buildRequirementIntel(input: IntelInput): Intel {
  const { request, client, answers, features, states, questions, conflicts, proposalBlock } = input;

  /* Items — section facts first, then features. */
  const items: IntelItem[] = [];
  const sectionByKey: Record<string, IntelItem> = {};
  for (const s of SECTIONS.filter((sec) => sec.weight > 0)) {
    const item = sectionItem(`section-${s.key}`, s.key, s.label, states[s.key] === true, "Client form");
    items.push(item);
    sectionByKey[s.key] = item;
  }
  for (const f of features) items.push(featureItem(f));

  const required = items.filter((i) => i.mode === "REQUIRED");
  const optional = items.filter((i) => i.mode === "OPTIONAL");
  const notApplicable = items.filter((i) => i.mode === "NOT_APPLICABLE");

  /* Clarification-derived statuses — a question on a section means the
     section's item is IN_REVIEW (answered) or WAITING (client sent). */
  const OPEN_QUESTION_STATUSES = ["READY_TO_SEND", "SENDING", "SENT", "DELIVERED", "OPENED"];
  const REVIEW_QUESTION_STATUSES = ["ANSWERED", "UNDER_REVIEW"];
  const awaiting = questions.filter((q) => OPEN_QUESTION_STATUSES.includes(q.status));
  const answered = questions.filter((q) => REVIEW_QUESTION_STATUSES.includes(q.status));
  for (const q of questions) {
    const item = sectionByKey[q.section];
    if (!item) continue;
    if (REVIEW_QUESTION_STATUSES.includes(q.status)) item.status = "IN_REVIEW";
    else if (OPEN_QUESTION_STATUSES.includes(q.status)) item.status = "WAITING";
  }

  /* Accepted clarifications — an admin-accepted answer confirms the section
     item it targets. A RESOLVED question with a stored response is the
     accepted answer; it only confirms the section when no OTHER question on
     that section is still open or awaiting review (spec 28/29). */
  const acceptedKeys = acceptedClarificationKeys(questions);
  for (const item of items) {
    if (item.mode === "REQUIRED" && item.status === "ACTION_REQUIRED" && item.section && acceptedKeys.has(item.section)) {
      item.status = "CONFIRMED";
      item.source = "Client clarification";
      item.detail = "Confirmed from an accepted client answer";
    }
  }

  /* Real blockers — unresolved blocking clarifications + missing required
     items. Optional and inactive items never block (spec 10, 11). */
  const blockers: Blocker[] = proposalBlock.blockers.map((b) => ({
    kind: "clarification",
    id: b.id,
    label: b.label,
    questionId: b.id,
  }));
  const missingRequired = required.filter((i) => i.status === "ACTION_REQUIRED");
  for (const i of missingRequired) {
    blockers.push({ kind: "item", id: i.id, label: i.label, section: i.section });
  }

  const requiredDone = required.filter((i) => i.status === "CONFIRMED").length;
  const requiredTotal = required.length;
  const pendingCount = blockers.length;

  const completion = {
    required: requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0,
    optional: 0, // optional is never counted in completion (spec 13)
    blocking:
      blockers.length > 0 ? Math.round(((requiredTotal - missingRequired.length) / requiredTotal) * 100) : 100,
  };

  /* Health (spec 15, 44) — red only for real problems. */
  let health: Intel["health"];
  if (proposalBlock.blocked) {
    health = { level: "BLOCKED", reason: `${proposalBlock.blockers.length} blocking clarification${proposalBlock.blockers.length === 1 ? "" : "s"} unresolved.` };
  } else if (missingRequired.length > 0 || conflicts.length > 0) {
    const parts = [
      missingRequired.length > 0 ? `${missingRequired.length} required item${missingRequired.length === 1 ? "" : "s"} missing` : null,
      conflicts.length > 0 ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} open` : null,
    ].filter(Boolean);
    health = { level: "AT_RISK", reason: parts.join(" · ") + "." };
  } else if (awaiting.length > 0) {
    health = { level: "WATCH", reason: `${awaiting.length} clarification question${awaiting.length === 1 ? "" : "s"} awaiting the client.` };
  } else if (answered.length > 0) {
    health = { level: "WATCH", reason: `${answered.length} client response${answered.length === 1 ? "" : "s"} awaiting review.` };
  } else {
    health = { level: "GOOD", reason: "All required information is confirmed." };
  }

  /* Proposal readiness check (spec 40, 68) — exact reasons when not ready.
     A section is confirmed when its data is complete OR an accepted
     clarification satisfied it — same rule as the items above. */
  const sectionConfirmed = (key: string) => states[key] === true || acceptedKeys.has(key);
  const submitted = ["SUBMITTED", "CHANGES_REQUESTED", "REVISION_SUBMITTED", "APPROVED"].includes(request.status);
  const scopeOk = sectionConfirmed("scope");
  const featuresOk = features.length > 0;
  const timelineOk = sectionConfirmed("timeline");
  const commercialOk = sectionConfirmed("commercial");
  const blockersOk = blockers.length === 0;
  const conflictsOk = conflicts.length === 0;

  const rows: ReadinessRow[] = [
    { key: "client", label: "Client identified", ok: Boolean(client), note: client ? client.companyName : "No client is linked to this requirement." },
    { key: "submitted", label: "Requirement submitted", ok: submitted, note: submitted ? "Requirement received from the client" : "The client has not submitted the requirement yet." },
    { key: "scope", label: "Scope confirmed", ok: scopeOk, note: scopeOk ? "Scope captured" : "Scope has not been confirmed." },
    { key: "features", label: "Core features confirmed", ok: featuresOk, note: featuresOk ? `${features.length} feature${features.length === 1 ? "" : "s"} selected` : "No features have been selected." },
    { key: "timeline", label: "Timeline confirmed", ok: timelineOk, note: timelineOk ? "Timeline captured" : "Timeline has not been confirmed." },
    { key: "commercial", label: "Commercial information", ok: commercialOk, note: commercialOk ? "Budget model captured" : "Commercial information has not been provided." },
    { key: "blockers", label: "No blocking clarifications", ok: blockersOk, note: blockersOk ? "No blocking clarifications" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} remain.` },
    { key: "conflicts", label: "No unresolved conflicts", ok: conflictsOk, note: conflictsOk ? "No open conflicts" : `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} need resolution.` },
  ];
  const okCount = rows.filter((r) => r.ok).length;
  const readiness: Intel["readiness"] = {
    ok: okCount === rows.length,
    percent: Math.round((okCount / rows.length) * 100),
    rows,
  };

  /* Next best action (spec 49) — computed from real state, never hardcoded. */
  const nextAction: NextAction = (() => {
    if (request.status === "DRAFT") return { kind: "send", text: "Send the requirement link to the client." };
    if (answered.length > 0) {
      const first = answered[0];
      return { kind: "review-question", text: `Review the client's answer for ${first.sectionLabel}.`, questionId: first.id };
    }
    if (awaiting.length > 0) {
      const first = awaiting[0];
      return { kind: "waiting", text: `Waiting for the client's response on ${first.sectionLabel}.` };
    }
    if (missingRequired.length > 0) {
      const first = missingRequired[0];
      return { kind: "ask", text: `Gather missing information: ${first.label}.`, section: first.section ?? "business" };
    }
    if (conflicts.length > 0) return { kind: "resolve-conflict", text: "Resolve the flagged requirement conflict." };
    if (request.status === "SUBMITTED" || request.status === "REVISION_SUBMITTED") {
      return readiness.ok
        ? { kind: "approve", text: "Everything is complete — approve the requirement." }
        : { kind: "review", text: "Review the requirement before approval." };
    }
    if (request.status === "APPROVED") return { kind: "proposal", text: "Generate the proposal from the approved requirement." };
    if (request.status === "CHANGES_REQUESTED") return { kind: "waiting", text: "Waiting for the client to submit the requested changes." };
    return { kind: "none", text: "Nothing requires action right now." };
  })();

  /* What we know — only actual confirmed values (spec 95). */
  const known: Intel["known"] = [];
  const business = answers.business ?? {};
  const vision = answers.vision ?? {};
  const timeline = answers.timeline ?? {};
  const commercial = answers.commercial ?? {};
  const scope = answers.scope ?? {};
  const design = answers.design ?? {};
  const push = (label: string, value: unknown, source = "Client form") => {
    const v = str(value);
    if (v) known.push({ label, value: v.length > 140 ? `${v.slice(0, 137)}…` : v, source });
  };
  push("Business", business.description);
  push("Goal", vision.description);
  push("Success looks like", vision.success);
  if (listLen(scope.included) > 0) push("In scope", (scope.included as unknown[]).join(", "));
  if (listLen(scope.excluded) > 0) push("Out of scope", (scope.excluded as unknown[]).join(", "));
  push("Timeline", timeline.launchWindow);
  push("Budget model", commercial.budgetModel);
  push("Budget range", commercial.budgetRange);
  push("Design direction", design.style);
  push("Features", features.length > 0 ? features.map((f) => f.name).join(", ") : null);

  /* What we are waiting for + what needs review. */
  const waitingOnClient = awaiting.map((q) => ({
    questionId: q.id,
    label: q.clientQuestion,
    recipient: q.recipientName,
    section: q.sectionLabel,
    since: q.createdAt,
  }));
  const needsReview = answered.map((q) => ({
    questionId: q.id,
    label: q.clientQuestion,
    section: q.sectionLabel,
  }));

  /* What changed — from the request's own version history. */
  const changed = latestChanges(input.revisions ?? []);

  return {
    items,
    required,
    optional,
    notApplicable,
    blockers,
    pendingCount,
    requiredDone,
    requiredTotal,
    completion,
    health,
    readiness,
    nextAction,
    known,
    waitingOnClient,
    needsReview,
    changed,
  };
}

/** Export the section list so the UI can render section-level status too. */
export function sectionLabel(key: string): string {
  return getSection(key)?.label ?? key;
}

/* ── Accepted-clarification keys ───────────────────────────────
   The single source of truth for "has this section been satisfied by an
   admin-accepted client answer?". A RESOLVED question with a non-empty
   response is the accepted answer; it only counts when no other question
   on that section is still open or awaiting review. The backend accept
   transaction and every derived surface use this same rule. */

export const UNRESOLVED_QUESTION_STATUSES = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "READY_TO_SEND",
  "SENDING",
  "SENT",
  "DELIVERED",
  "OPENED",
  "ANSWERED",
  "UNDER_REVIEW",
];

export function acceptedClarificationKeys(
  questions: Pick<IntelQuestion, "section" | "status" | "response">[],
): Set<string> {
  const unresolved = new Set<string>();
  const resolved: { section: string; response: string | null }[] = [];
  for (const q of questions) {
    if (UNRESOLVED_QUESTION_STATUSES.includes(q.status)) unresolved.add(q.section);
    if (q.status === "RESOLVED" && (q.response ?? "").trim().length > 0) resolved.push(q);
  }
  const out = new Set<string>();
  for (const r of resolved) {
    if (!unresolved.has(r.section)) out.add(r.section);
  }
  return out;
}

/**
 * Section completion states with accepted clarifications overlaid.
 * The single authoritative "is this section satisfied" map: a section is
 * confirmed when its stored data is complete OR an accepted clarification
 * answer satisfied it (and no other question on the section is still open).
 */
export function sectionStatesWithAccepted(
  states: Record<string, boolean>,
  questions: Pick<IntelQuestion, "section" | "status" | "response">[],
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...states };
  for (const key of acceptedClarificationKeys(questions)) out[key] = true;
  return out;
}

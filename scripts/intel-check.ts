/* Quick sanity check for the Requirement Intelligence engine — not part of
   the app. Run: npx tsx scripts/intel-check.ts */
import { buildRequirementIntel, type IntelInput } from "../src/lib/requirement-intel";

const base: IntelInput = {
  request: { id: "r1", status: "SUBMITTED", title: "Store", revision: 1, completeness: 0, readiness: 0 },
  client: { id: "c1", companyName: "CHE" },
  answers: {},
  features: [],
  states: {},
  questions: [],
  conflicts: [],
  proposalBlock: { blocked: false, blockers: [] },
};

function has(ans: Record<string, Record<string, unknown>>, states: Record<string, boolean>) {
  return { ...base, answers: ans, states } as IntelInput;
}

// Scenario 1 — totally empty: no data → NOT READY, no fake percentages
const empty = buildRequirementIntel(base);
console.log("EMPTY:", JSON.stringify({
  pending: empty.pendingCount,
  requiredTotal: empty.requiredTotal,
  readiness: { ok: empty.readiness.ok, percent: empty.readiness.percent },
  health: empty.health,
  next: empty.nextAction.kind,
  known: empty.known.length,
}));

// Scenario 2 — all sections complete, no questions → READY, HEALTH GOOD
const allStates: Record<string, boolean> = {};
for (const k of ["business", "vision", "users", "scope", "design", "technology", "timeline", "commercial"]) allStates[k] = true;
const done = has(
  {
    business: { description: "Sells plants online" },
    vision: { description: "Grow revenue" },
    timeline: { launchWindow: "1–3 months" },
    commercial: { budgetModel: "Fixed price" },
    scope: { included: ["Storefront"], excluded: ["Mobile app"] },
  },
  allStates,
);
const ok = buildRequirementIntel(done);
console.log("DONE:", JSON.stringify({
  pending: ok.pendingCount,
  requiredDone: `${ok.requiredDone}/${ok.requiredTotal}`,
  readiness: { ok: ok.readiness.ok, percent: ok.readiness.percent },
  health: ok.health,
  next: ok.nextAction.kind,
  known: ok.known.map((k) => k.label),
}));

// Scenario 3 — blocking clarification unresolved → BLOCKED, proposal not ready
const blocked = buildRequirementIntel({
  ...done,
  questions: [{
    id: "q1", section: "scope", sectionLabel: "Scope", categoryLabel: "Scope",
    clientQuestion: "Confirm payment gateway?", isBlocking: true, status: "SENT",
    recipientName: "CHE", response: null, respondedAt: null, createdAt: new Date().toISOString(),
  }],
  proposalBlock: { blocked: true, blockers: [{ id: "q1", label: "Confirm payment gateway?", category: "Scope" }] },
} as IntelInput);
console.log("BLOCKED:", JSON.stringify({
  pending: blocked.pendingCount,
  health: blocked.health,
  waiting: blocked.waitingOnClient.length,
  readiness: { ok: blocked.readiness.ok, percent: blocked.readiness.percent },
  next: blocked.nextAction.kind,
}));

// Scenario 4 — must-have feature unconfigured + optional feature → item intelligence
const items = buildRequirementIntel({
  ...done,
  features: [
    { id: "f1", name: "Payments", priority: "MUST_HAVE", description: "", config: {}, acceptanceCriteria: [] },
    { id: "f2", name: "Logo", priority: "NICE_TO_HAVE", description: "", config: {}, acceptanceCriteria: [] },
  ],
} as IntelInput);
console.log("ITEMS:", JSON.stringify({
  required: items.required.map((i) => `${i.label}:${i.status}`),
  optional: items.optional.map((i) => `${i.label}:${i.status}`),
  pending: items.pendingCount,
  health: items.health.level,
}));

import type { ClientDetail } from "./client-serialize";

/* ────────────────────────────────────────────────────────────────
   LEAD INTELLIGENCE — deterministic lead insight.
   The lifecycle and the one-sentence "what's happening" are derived
   from the lead's real records — never invented. The UI labels this
   CURRENT STATE (deterministic), distinct from anything the AI says.
──────────────────────────────────────────────────────────────── */

export type LifecycleStage = {
  key: string;
  label: string;
  state: "done" | "current" | "future";
};

const LIFECYCLE_DEF: { key: string; label: string }[] = [
  { key: "QUALIFIED", label: "Qualified" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "REQUIREMENT", label: "Requirement" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "WON", label: "Won" },
];

/** Highest lifecycle stage this lead has reached, from real records. */
export function lifecycleIndex(detail: ClientDetail): number {
  const { counts, projects } = detail;
  if (projects.length > 0) return 4; // WON
  if (counts.proposals > 0) return 3; // PROPOSAL
  if (counts.requirements > 0 || detail.requirementRequests.length > 0) return 2; // REQUIREMENT
  if (counts.messages > 0 || counts.activities > 0) return 1; // CONTACTED
  return 0; // QUALIFIED
}

export function lifecycleStages(detail: ClientDetail): LifecycleStage[] {
  const current = lifecycleIndex(detail);
  return LIFECYCLE_DEF.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: i < current ? "done" : i === current ? "current" : "future",
  }));
}

/** Lead code — e.g. LD-000001 — derived from the real record id. */
export function leadCode(clientId: string): string {
  return `LD-${clientId.slice(-6).toUpperCase()}`;
}

/** One concise sentence describing the current situation — fully deterministic. */
export function currentStateSentence(detail: ClientDetail): string {
  const d = detail;
  if (d.client.status === "ARCHIVED") return "This lead is archived. History is preserved, but no new work is expected.";
  if (d.client.status === "INACTIVE") return `No activity for some time — this lead needs a deliberate re-engagement.`;

  const risks = d.health.reasons.filter((r) => r.kind === "risk");
  const warns = d.health.reasons.filter((r) => r.kind === "warn");

  if (d.nextAction) {
    switch (d.nextAction.kind) {
      case "review":
        return `Requirement "${d.nextAction.detail}" is awaiting review.`;
      case "proposal":
        return `A proposal is awaiting the client's response.`;
      case "payment":
        return `There is an overdue payment to follow up on.`;
      case "task":
        return `A task is blocked and needs attention.`;
      case "deadline":
        return `A project deadline is approaching.`;
      case "reach-out":
        return "Communication has stalled — a touchpoint is overdue.";
      case "create":
        return d.nextAction.title.toLowerCase().includes("proposal")
          ? "Requirements are captured — the proposal is the next step."
          : "The proposal is approved — the project can begin.";
    }
  }

  if (risks.length > 0) return risks[0].text.replace(/^Payment overdue/, "A payment is overdue").replace(/^No activity/, "Communication has gone quiet");
  if (warns.length > 0) return warns[0].text;

  if (d.projects.length > 0) return `Project "${d.projects[0].name}" is in delivery at ${d.projects[0].progress}%.`;
  if (d.proposals.length > 0) return `Proposal "${d.proposals[0].title}" is ${d.proposals[0].status.replace(/_/g, " ").toLowerCase()}.`;
  if (d.requirements.length > 0) return `Requirement "${d.requirements[0].title}" was captured and is being processed.`;
  if (d.counts.messages > 0 || d.counts.activities > 0) return "An active conversation is underway — the relationship is building.";
  return "A new lead has been captured and is ready for first contact.";
}

/** Opportunity signal — the honest facts, shown instead of a magic score. */
export function opportunitySignals(detail: ClientDetail): { label: string; positive: boolean }[] {
  const s: { label: string; positive: boolean }[] = [];
  if (detail.requirementRequests.length > 0 || detail.requirements.length > 0) {
    s.push({ label: "Requirement captured", positive: true });
  }
  if (detail.counts.messages > 0 || detail.counts.activities > 0) {
    s.push({ label: "Active communication", positive: true });
  }
  if (detail.commercial.contractValue > 0) {
    s.push({ label: "Commercial relationship", positive: true });
  }
  const hasBudget =
    detail.requirementRequests.length > 0 || detail.proposals.length > 0;
  if (hasBudget) s.push({ label: "Commercial intent", positive: true });
  if (detail.health.reasons.some((r) => r.kind === "risk")) {
    s.push({ label: "Needs attention", positive: false });
  }
  if (s.length === 0) s.push({ label: "Early-stage lead", positive: true });
  return s;
}

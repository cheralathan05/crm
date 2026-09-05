import { db } from "./db";

/* ────────────────────────────────────────────────────────────────
   CLIENT COMMAND CENTER — DOMAIN LOGIC
   All rules that decide health, lifecycle stage, next actions and
   scores live here. Everything is derived from real database state —
   never invented. Every helper is workspace-scoped by userId.
──────────────────────────────────────────────────────────────── */

/* ── Auth & workspace scoping ───────────────────────────────── */

/** Resolve the authenticated user's workspace, or null. */
export async function getWorkspaceForUser(userId: string) {
  return db.workspace.findUnique({ where: { ownerId: userId } });
}

/**
 * Load a client only if it belongs to the user's workspace.
 * Returns null when unauthorized/not found — never leak existence.
 */
export async function getClientForUser(userId: string, clientId: string) {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) return null;
  return db.client.findFirst({ where: { id: clientId, workspaceId: workspace.id } });
}

/* ── Date helpers ────────────────────────────────────────────── */

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function hoursSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.max(0, (Date.now() - d.getTime()) / 3_600_000);
}

export function formatRelative(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ── Health engine — explainable, never a magic score ────────── */

export type HealthReason = { kind: "ok" | "warn" | "risk"; text: string };

export type ClientSnapshot = {
  status: string;
  stage: string;
  hasRequirementUnderReview: boolean;
  hasProposalAwaiting: number | null; // days awaiting response
  overduePayments: { amount: number; days: number }[];
  upcomingPayments: { amount: number; days: number }[];
  blockedTasks: number;
  atRiskProjects: number;
  openTasks: number;
  lastActivityDays: number | null;
  projectOnTrack: boolean;
};

export type HealthResult = {
  health: "HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK" | "INACTIVE";
  reasons: HealthReason[];
};

/**
 * Health is explainable: each state is backed by real conditions.
 *   HEALTHY         — everything on track
 *   NEEDS_ATTENTION — one actionable item (proposal waiting, payment due)
 *   AT_RISK         — overdue money, blocked work, stale relationship
 *   INACTIVE        — no activity for a long period
 */
export function computeHealth(s: ClientSnapshot): HealthResult {
  if (s.status === "ARCHIVED") return { health: "INACTIVE", reasons: [] };
  if (s.status === "INACTIVE") return { health: "INACTIVE", reasons: [] };

  const reasons: HealthReason[] = [];
  const warnings: string[] = [];

  if (s.blockedTasks > 0) {
    warnings.push(`${s.blockedTasks} blocked ${s.blockedTasks === 1 ? "task" : "tasks"}`);
  }
  if (s.atRiskProjects > 0) {
    warnings.push(`${s.atRiskProjects} ${s.atRiskProjects === 1 ? "project" : "projects"} at risk`);
  }
  if (s.hasRequirementUnderReview) warnings.push("requirement awaiting review");

  const overdueTotal = s.overduePayments.reduce((a, p) => a + p.amount, 0);
  const hasOverdue = s.overduePayments.length > 0;
  const proposalStale = s.hasProposalAwaiting !== null && s.hasProposalAwaiting >= 5;
  const stale =
    s.lastActivityDays !== null && s.lastActivityDays > 12;

  if (hasOverdue) {
    reasons.push({ kind: "risk", text: `Payment overdue — ₹${formatINR(overdueTotal)}` });
  }
  if (proposalStale) {
    reasons.push({
      kind: "risk",
      text: `Proposal awaiting response for ${s.hasProposalAwaiting} days`,
    });
  }
  if (stale) {
    reasons.push({ kind: "risk", text: `No activity for ${s.lastActivityDays} days` });
  }

  const needsAttention =
    warnings.length > 0 || s.hasProposalAwaiting !== null || s.upcomingPayments.length > 0;

  if (reasons.length > 0) return { health: "AT_RISK", reasons };
  if (needsAttention) {
    return {
      health: "NEEDS_ATTENTION",
      reasons: [
        ...warnings.map((w) => ({ kind: "warn" as const, text: w })),
        ...(s.hasProposalAwaiting !== null
          ? [{ kind: "warn" as const, text: `Proposal awaiting response (${s.hasProposalAwaiting}d)` }]
          : []),
        ...s.upcomingPayments.map((p) => ({
          kind: "warn" as const,
          text: `Payment of ₹${formatINR(p.amount)} due in ${p.days}d`,
        })),
      ],
    };
  }

  reasons.push({ kind: "ok", text: "Active communication" });
  if (s.projectOnTrack) reasons.push({ kind: "ok", text: "Project on schedule" });
  if (!hasOverdue) reasons.push({ kind: "ok", text: "No overdue payment" });
  if (!s.hasRequirementUnderReview) reasons.push({ kind: "ok", text: "Requirements progressing" });
  return { health: "HEALTHY", reasons };
}

/* ── Lifecycle stage — derived from real records ─────────────── */

export function computeStage(s: {
  status: string;
  hasRequirements: boolean;
  hasApprovedRequirement: boolean;
  hasProposal: boolean;
  hasApprovedProposal: boolean;
  hasProject: boolean;
  projectCompleted: boolean;
}): string {
  if (s.status === "LEAD") return "LEAD";
  if (s.projectCompleted) return "DELIVERY";
  if (s.hasProject) return "PROJECT";
  if (s.hasApprovedProposal) return "APPROVAL";
  if (s.hasProposal) return "PROPOSAL";
  if (s.hasApprovedRequirement) return "QUALIFIED";
  if (s.hasRequirements) return "REQUIREMENTS";
  return "QUALIFIED";
}

/* ── Next Action engine — from real business conditions ──────── */

export type NextAction = {
  title: string;
  detail: string;
  kind: "review" | "proposal" | "payment" | "task" | "deadline" | "reach-out" | "create";
  targetId?: string;
  targetHref?: string;
};

export function computeNextAction(
  s: ClientSnapshot,
  latest: {
    requirementUnderReview?: string;
    proposalAwaiting?: string;
    overdue?: { amount: number };
    blockedTask?: string;
    projectDeadline?: Date;
  },
): NextAction | null {
  if (s.status === "ARCHIVED") return null;
  if (s.status === "INACTIVE") {
    return {
      title: "Re-engage client",
      detail: `No activity for ${s.lastActivityDays} days — plan the next touchpoint.`,
      kind: "reach-out",
    };
  }

  if (s.hasRequirementUnderReview && latest.requirementUnderReview) {
    return {
      title: "Review requirement",
      detail: latest.requirementUnderReview,
      kind: "review",
      targetHref: "#requirements",
    };
  }
  if (s.hasProposalAwaiting !== null && latest.proposalAwaiting) {
    return {
      title: "Proposal follow-up",
      detail: `${latest.proposalAwaiting} — awaiting client response for ${s.hasProposalAwaiting}d.`,
      kind: "proposal",
      targetHref: "#proposals",
    };
  }
  if (s.overduePayments.length > 0 && latest.overdue) {
    return {
      title: "Collect overdue payment",
      detail: `₹${formatINR(latest.overdue.amount)} is overdue — follow up with the client.`,
      kind: "payment",
      targetHref: "#commercial",
    };
  }
  if (s.blockedTasks > 0 && latest.blockedTask) {
    return {
      title: "Unblock task",
      detail: latest.blockedTask,
      kind: "task",
      targetHref: "#work",
    };
  }
  if (latest.projectDeadline) {
    const days = daysBetween(new Date(), latest.projectDeadline);
    if (days >= 0 && days <= 3) {
      return {
        title: "Review project deadline",
        detail: `Deadline approaching — ${days} ${days === 1 ? "day" : "days"} left.`,
        kind: "deadline",
        targetHref: "#work",
      };
    }
  }
  if (s.stage === "REQUIREMENTS") {
    return { title: "Draft proposal", detail: "Requirements are approved — prepare the proposal.", kind: "create", targetHref: "#proposals" };
  }
  if (s.stage === "APPROVAL") {
    return { title: "Create project", detail: "Proposal approved — start the project.", kind: "create", targetHref: "#work" };
  }
  return null;
}

/* ── Relationship score — explainable breakdown ──────────────── */

export type RelationshipScore = {
  total: number;
  breakdown: { label: string; value: number; reason: string }[];
};

export function computeRelationshipScore(s: {
  hasActivity: boolean;
  lastActivityDays: number | null;
  messages: number;
  projectProgress: number | null;
  paidRatio: number | null; // 0..1
  requirementsApprovedRatio: number;
}): RelationshipScore {
  const engagement = s.hasActivity
    ? Math.max(20, 100 - (s.lastActivityDays ?? 0) * 4)
    : 30;
  const communication = Math.min(100, 35 + s.messages * 5);
  const delivery = s.projectProgress !== null ? s.projectProgress : 40;
  const payment = s.paidRatio !== null ? Math.round(s.paidRatio * 100) : 50;
  const requirements = Math.round(s.requirementsApprovedRatio * 100);

  const values = [engagement, communication, delivery, payment, requirements];
  const total = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    total,
    breakdown: [
      { label: "Engagement", value: engagement, reason: s.lastActivityDays !== null ? `Last activity ${s.lastActivityDays}d ago` : "No recorded activity yet" },
      { label: "Communication", value: communication, reason: `${s.messages} recorded ${s.messages === 1 ? "message" : "messages"}` },
      { label: "Delivery", value: delivery, reason: s.projectProgress !== null ? `Project ${s.projectProgress}% complete` : "No project in progress" },
      { label: "Payment", value: payment, reason: s.paidRatio !== null ? `${Math.round(s.paidRatio * 100)}% of contract paid` : "No payment records yet" },
      { label: "Requirements", value: requirements, reason: `${Math.round(s.requirementsApprovedRatio * 100)}% of requirements approved` },
    ],
  };
}

/* ── Money formatting ────────────────────────────────────────── */

export function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatCompactINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${n}`;
}

/* ── Duplicate detection ─────────────────────────────────────── */

export async function findDuplicateClients(
  userId: string,
  input: { companyName?: string; email?: string; domain?: string },
): Promise<
  { id: string; companyName: string; status: string; createdAt: Date; match: "name" | "email" | "domain" }[]
> {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) return [];

  const name = input.companyName?.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase();
  const domain = input.domain?.trim().toLowerCase();

  const candidates = await db.client.findMany({
    where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
    select: { id: true, companyName: true, status: true, createdAt: true, email: true, domain: true },
  });

  const results: { id: string; companyName: string; status: string; createdAt: Date; match: "name" | "email" | "domain" }[] = [];
  for (const c of candidates) {
    const cName = c.companyName.toLowerCase();
    const cEmail = c.email?.toLowerCase();
    const cDomain = c.domain?.toLowerCase();
    if (name && cName.includes(name)) {
      results.push({ ...c, match: "name" });
    } else if (email && cEmail && cEmail === email) {
      results.push({ ...c, match: "email" });
    } else if (domain && cDomain && (cDomain === domain || cDomain.includes(domain))) {
      results.push({ ...c, match: "domain" });
    }
  }
  return results.slice(0, 5);
}

/* ── Audit helpers ───────────────────────────────────────────── */

export async function recordAudit(input: {
  clientId: string;
  entity: string;
  action: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.clientAuditEvent.create({
    data: {
      clientId: input.clientId,
      entity: input.entity as never,
      action: input.action as never,
      entityId: input.entityId,
      actorId: input.actorId,
      actorName: input.actorName,
      before: input.before !== undefined ? JSON.stringify(input.before) : "{}",
      after: input.after !== undefined ? JSON.stringify(input.after) : "{}",
    },
  });
}

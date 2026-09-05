import { db } from "./db";
import {
  computeHealth,
  computeNextAction,
  computeRelationshipScore,
  computeStage,
  daysBetween,
  formatRelative,
  hoursSince,
  type NextAction,
} from "./clients";

/* ────────────────────────────────────────────────────────────────
   CLIENT SERIALIZATION — builds the DTOs the UI consumes.
   Every value is derived from the real database row.
──────────────────────────────────────────────────────────────── */

type ClientRow = Awaited<ReturnType<typeof db.client.findFirst>>;

/** Small dependency-free JSON tag list helper (schema stores JSON strings). */
export function parseTagList(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseCustomFields(json: string | null | undefined): Record<string, string> {
  try {
    const v = JSON.parse(json ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

type RelationBundle = {
  requirementRequests: {
    id: string;
    reference: string;
    title: string;
    projectType: string;
    status: string;
    completeness: number;
    readiness: number;
    revision: number;
    sentTo: string | null;
    responderName: string | null;
    submittedAt: Date | null;
    updatedAt: Date;
  }[];
  contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null; whatsapp: string | null; preferredChannel: string | null; isPrimary: boolean }[];
  requirements: { id: string; title: string; status: string; priority: string; submittedAt: Date; approvedAt: Date | null }[];
  proposals: { id: string; title: string; amount: number | null; status: string; sentAt: Date | null; viewedAt: Date | null; validUntil: Date | null }[];
  projects: { id: string; name: string; stage: string; health: string; progress: number; deadline: Date | null; startedAt: Date | null }[];
  payments: { id: string; type: string; amount: number; status: string; dueAt: Date | null; paidAt: Date | null; invoiceNumber: string | null; label: string | null }[];
  activities: { id: string; type: string; title: string; createdAt: Date }[];
  messages: { id: string; channel: string; subject: string; direction: string | null; at: Date }[];
  notes: { id: string; content: string; authorName: string | null; createdAt: Date }[];
  documents: { id: string; name: string; category: string; url: string | null; size: number | null; uploadedByName: string | null; createdAt: Date }[];
  openTasks: { id: string; title: string; status: string; blocked: boolean; dueAt: Date | null; teamRole: string | null; assigneeName: string | null }[];
  blockedTasks: number;
  audit: { id: string; entity: string; action: string; actorName: string | null; createdAt: Date }[];
};

export type TeamMember = { role: string; count: number; assignees: { name: string; tasks: number }[] };

/** Aggregate tasks into the team context — roles, members and current load. */
export function aggregateTeam(tasks: { teamRole: string | null; assigneeName: string | null }[]): TeamMember[] {
  const byRole = new Map<string, Map<string, number>>();
  for (const t of tasks) {
    const role = t.teamRole ?? "General";
    const assignee = t.assigneeName ?? "Unassigned";
    if (!byRole.has(role)) byRole.set(role, new Map());
    const roleMap = byRole.get(role)!;
    roleMap.set(assignee, (roleMap.get(assignee) ?? 0) + 1);
  }
  return [...byRole.entries()]
    .map(([role, assignees]) => ({
      role,
      count: [...assignees.values()].reduce((a, b) => a + b, 0),
      assignees: [...assignees.entries()]
        .map(([name, tasks]) => ({ name, tasks }))
        .sort((a, b) => b.tasks - a.tasks),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Load all related records needed to describe a client (lightweight selects). */
export async function loadClientRelations(clientId: string): Promise<RelationBundle> {
  const [contacts, requirementRequests, requirements, proposals, projects, payments, activities, messages, notes, documents, tasks, audit] =
    await Promise.all([
      db.contact.findMany({ where: { clientId }, select: { id: true, name: true, role: true, email: true, phone: true, whatsapp: true, preferredChannel: true, isPrimary: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
      db.requirementRequest.findMany({
        where: { clientId },
        select: {
          id: true, reference: true, title: true, projectType: true, status: true, completeness: true,
          readiness: true, revision: true, sentTo: true, responderName: true, submittedAt: true, updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.clientRequirement.findMany({ where: { clientId }, select: { id: true, title: true, status: true, priority: true, submittedAt: true, approvedAt: true }, orderBy: { submittedAt: "desc" } }),
      db.clientProposal.findMany({ where: { clientId }, select: { id: true, title: true, amount: true, status: true, sentAt: true, viewedAt: true, validUntil: true }, orderBy: { createdAt: "desc" } }),
      db.clientProject.findMany({ where: { clientId }, select: { id: true, name: true, stage: true, health: true, progress: true, deadline: true, startedAt: true }, orderBy: { createdAt: "desc" } }),
      db.clientPayment.findMany({ where: { clientId }, select: { id: true, type: true, amount: true, status: true, dueAt: true, paidAt: true, invoiceNumber: true, label: true }, orderBy: { createdAt: "desc" } }),
      db.clientActivity.findMany({ where: { clientId }, select: { id: true, type: true, title: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 40 }),
      db.clientMessage.findMany({ where: { clientId }, select: { id: true, channel: true, subject: true, direction: true, at: true }, orderBy: { at: "desc" }, take: 25 }),
      db.clientNote.findMany({ where: { clientId }, select: { id: true, content: true, authorName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 25 }),
      db.clientDocument.findMany({ where: { clientId }, select: { id: true, name: true, category: true, url: true, size: true, uploadedByName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 }),
      db.clientTask.findMany({ where: { clientId }, select: { id: true, title: true, status: true, dueAt: true, teamRole: true, assigneeName: true }, orderBy: { createdAt: "desc" } }),
      db.clientAuditEvent.findMany({ where: { clientId }, select: { id: true, entity: true, action: true, actorName: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 60 }),
    ]);

  const openTasks = tasks
    .filter((t) => t.status !== "DONE")
    .map((t) => ({ id: t.id, title: t.title, status: t.status, blocked: t.status === "BLOCKED", dueAt: t.dueAt, teamRole: t.teamRole, assigneeName: t.assigneeName }));

  return {
    contacts,
    requirementRequests,
    requirements,
    proposals,
    projects,
    payments,
    activities,
    messages,
    notes,
    documents,
    openTasks,
    blockedTasks: tasks.filter((t) => t.status === "BLOCKED").length,
    audit,
  };
}

/** Build the full Command Center DTO for one client. */
export async function serializeClientDetail(client: NonNullable<ClientRow>, actorName: string) {
  const rel = await loadClientRelations(client.id);

  const hasRequirementUnderReview = rel.requirements.some((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED");
  const awaitingProposal = rel.proposals.find((p) => p.status === "SENT" || p.status === "VIEWED");
  const proposalAwaitingDays = awaitingProposal?.sentAt ? daysBetween(awaitingProposal.sentAt, new Date()) : null;

  const overduePayments = rel.payments
    .filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && p.dueAt && p.dueAt < new Date()))
    .map((p) => ({ amount: p.amount, days: p.dueAt ? daysBetween(p.dueAt, new Date()) : 0 }));

  const upcomingPayments = rel.payments
    .filter((p) => p.status === "PENDING" && p.dueAt && p.dueAt >= new Date())
    .map((p) => ({ amount: p.amount, days: daysBetween(new Date(), p.dueAt as Date) }));

  const lastActivity =
    [...rel.activities.map((a) => a.createdAt), ...rel.messages.map((m) => m.at), client.lastActivityAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? client.createdAt;

  const lastActivityDays = daysBetween(lastActivity, new Date());
  const projectOnTrack = rel.projects.some((p) => p.health === "ON_TRACK" && p.stage !== "COMPLETED");

  const snapshot = {
    status: client.status,
    stage: client.stage,
    hasRequirementUnderReview,
    hasProposalAwaiting: proposalAwaitingDays,
    overduePayments,
    upcomingPayments,
    blockedTasks: rel.blockedTasks,
    atRiskProjects: rel.projects.filter((p) => p.health === "AT_RISK").length,
    openTasks: rel.openTasks.length,
    lastActivityDays,
    projectOnTrack,
  };

  const health = computeHealth(snapshot);

  const stage = computeStage({
    status: client.status,
    hasRequirements: rel.requirements.length > 0,
    hasApprovedRequirement: rel.requirements.some((r) => r.status === "APPROVED"),
    hasProposal: rel.proposals.length > 0,
    hasApprovedProposal: rel.proposals.some((p) => p.status === "APPROVED"),
    hasProject: rel.projects.length > 0,
    projectCompleted: rel.projects.some((p) => p.stage === "COMPLETED"),
  });

  const nextAction = computeNextAction(
    snapshot,
    {
      requirementUnderReview: rel.requirements.find((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED")?.title,
      proposalAwaiting: awaitingProposal?.title,
      overdue: overduePayments[0],
      blockedTask: rel.openTasks.find((t) => t.blocked)?.title,
      projectDeadline: rel.projects.find((p) => p.health !== "COMPLETED" && p.deadline)?.deadline ?? undefined,
    },
  );

  const paidTotal = rel.payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  const contractValue = rel.payments.reduce((a, p) => a + p.amount, 0);
  const score = computeRelationshipScore({
    hasActivity: rel.activities.length > 0 || rel.messages.length > 0,
    lastActivityDays,
    messages: rel.messages.length,
    projectProgress: rel.projects[0]?.progress ?? null,
    paidRatio: contractValue > 0 ? paidTotal / contractValue : null,
    requirementsApprovedRatio:
      rel.requirements.length > 0
        ? rel.requirements.filter((r) => r.status === "APPROVED").length / rel.requirements.length
        : 0,
  });

  const primaryContact = rel.contacts.find((c) => c.isPrimary) ?? rel.contacts[0] ?? null;

  return {
    requirementRequests: rel.requirementRequests,
    client: {
      id: client.id,
      companyName: client.companyName,
      industry: client.industry,
      businessType: client.businessType,
      description: client.description,
      website: client.website,
      email: client.email,
      phone: client.phone,
      status: client.status,
      leadSource: client.leadSource,
      leadScore: client.leadScore,
      ownerName: client.ownerName ?? actorName,
      tags: parseTagList(client.tags),
      customFields: parseCustomFields(client.customFields),
      createdAt: client.createdAt,
      lastActivityAt: lastActivity,
      lastActivityLabel: formatRelative(lastActivity),
      lastActivityHours: hoursSince(lastActivity),
    },
    stage,
    health,
    nextAction,
    score,
    counts: {
      contacts: rel.contacts.length,
      requirements: rel.requirements.length,
      proposals: rel.proposals.length,
      projects: rel.projects.length,
      openTasks: rel.openTasks.length,
      documents: rel.documents.length,
      payments: rel.payments.length,
      messages: rel.messages.length,
      activities: rel.activities.length,
    },
    documents: rel.documents,
    team: aggregateTeam(rel.openTasks),
    primaryContact,
    commercial: {
      contractValue,
      paid: paidTotal,
      pending: contractValue - paidTotal,
      overdue: overduePayments.reduce((a, p) => a + p.amount, 0),
    },
    requirements: rel.requirements,
    proposals: rel.proposals,
    projects: rel.projects,
    openTasks: rel.openTasks.slice(0, 8),
    blockedTasks: rel.blockedTasks,
    contacts: rel.contacts,
    payments: rel.payments,
    activities: rel.activities,
    messages: rel.messages,
    notes: rel.notes,
    audit: rel.audit,
  };
}

/** Build a lightweight list row (no full bundle). */
export async function serializeClientListRow(client: NonNullable<ClientRow>) {
  const rel = await loadClientRelations(client.id);

  const awaitingProposal = rel.proposals.find((p) => p.status === "SENT" || p.status === "VIEWED");
  const proposalAwaitingDays = awaitingProposal?.sentAt ? daysBetween(awaitingProposal.sentAt, new Date()) : null;

  const overduePayments = rel.payments
    .filter((p) => p.status === "OVERDUE" || (p.status === "PENDING" && p.dueAt && p.dueAt < new Date()))
    .map((p) => ({ amount: p.amount, days: p.dueAt ? daysBetween(p.dueAt, new Date()) : 0 }));

  const lastActivity =
    [...rel.activities.map((a) => a.createdAt), ...rel.messages.map((m) => m.at), client.lastActivityAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? client.createdAt;

  const health = computeHealth({
    status: client.status,
    stage: client.stage,
    hasRequirementUnderReview: rel.requirements.some((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED"),
    hasProposalAwaiting: proposalAwaitingDays,
    overduePayments,
    upcomingPayments: rel.payments
      .filter((p) => p.status === "PENDING" && p.dueAt && p.dueAt >= new Date())
      .map((p) => ({ amount: p.amount, days: daysBetween(new Date(), p.dueAt as Date) })),
    blockedTasks: rel.blockedTasks,
    atRiskProjects: rel.projects.filter((p) => p.health === "AT_RISK").length,
    openTasks: rel.openTasks.length,
    lastActivityDays: daysBetween(lastActivity, new Date()),
    projectOnTrack: rel.projects.some((p) => p.health === "ON_TRACK" && p.stage !== "COMPLETED"),
  });

  const stage = computeStage({
    status: client.status,
    hasRequirements: rel.requirements.length > 0,
    hasApprovedRequirement: rel.requirements.some((r) => r.status === "APPROVED"),
    hasProposal: rel.proposals.length > 0,
    hasApprovedProposal: rel.proposals.some((p) => p.status === "APPROVED"),
    hasProject: rel.projects.length > 0,
    projectCompleted: rel.projects.some((p) => p.stage === "COMPLETED"),
  });

  return {
    id: client.id,
    companyName: client.companyName,
    industry: client.industry,
    businessType: client.businessType,
    status: client.status,
    stage,
    health: health.health,
    healthReasons: health.reasons,
    ownerName: client.ownerName,
    tags: parseTagList(client.tags),
    project: rel.projects[0] ?? null,
    requirementsOpen: rel.requirements.filter((r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length,
    proposalStatus: awaitingProposal?.status ?? null,
    proposalAwaitingDays,
    pendingPayment: rel.payments
      .filter((p) => p.status === "PENDING")
      .reduce((a, p) => a + p.amount, 0),
    lastActivityLabel: formatRelative(lastActivity),
    nextAction: computeNextAction(
      {
        status: client.status,
        stage: client.stage,
        hasRequirementUnderReview: rel.requirements.some((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED"),
        hasProposalAwaiting: proposalAwaitingDays,
        overduePayments,
        upcomingPayments: [],
        blockedTasks: rel.blockedTasks,
        atRiskProjects: rel.projects.filter((p) => p.health === "AT_RISK").length,
        openTasks: rel.openTasks.length,
        lastActivityDays: daysBetween(lastActivity, new Date()),
        projectOnTrack: rel.projects.some((p) => p.health === "ON_TRACK" && p.stage !== "COMPLETED"),
      },
      {
        requirementUnderReview: rel.requirements.find((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED")?.title,
        proposalAwaiting: awaitingProposal?.title,
        overdue: overduePayments[0],
        blockedTask: rel.openTasks.find((t) => t.blocked)?.title,
        projectDeadline: rel.projects.find((p) => p.health !== "COMPLETED" && p.deadline)?.deadline ?? undefined,
      },
    )?.title ?? null,
  } as const;
}

export type ClientListRow = Awaited<ReturnType<typeof serializeClientListRow>>;
export type ClientDetail = Awaited<ReturnType<typeof serializeClientDetail>>;
export type { NextAction };

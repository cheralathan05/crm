import { db } from "./db";
import { recordAudit } from "./clients";
import type { ProposalDoc } from "./proposal-doc";
import { blockText } from "./proposal-doc";

/* ────────────────────────────────────────────────────────────────
   PROJECT DELIVERY OPERATING SYSTEM — DOMAIN LOGIC
   Connects:
   Approved Proposal + Verified Requirement Snapshot
   ↓
   Traceable Project + Milestones + Deliverables + Tasks + Team
   ↓
   Execution + Internal Review + Client Review + Acceptance
──────────────────────────────────────────────────────────────── */

export type ScopeItem = {
  id: string;
  category: "OBJECTIVE" | "FEATURE" | "DELIVERABLE" | "ARCHITECTURE" | "TIMELINE" | "GOVERNANCE" | "CONSTRAINT";
  title: string;
  detail: string;
  priority?: "MUST_HAVE" | "SHOULD_HAVE" | "NICE_TO_HAVE" | "HIGH" | "MEDIUM" | "LOW";
  included: boolean;
  sourceSection?: string;
  acceptanceCriteria?: string[];
};

export type SuggestedTask = {
  id: string;
  title: string;
  description?: string;
  teamRole: string;
  estimatedHours: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  milestoneIndex: number;
  deliverableIndex?: number;
};

export type SuggestedDeliverable = {
  id: string;
  title: string;
  description: string;
  category: string;
  proposalFeatureName?: string;
  acceptanceCriteria: string[];
  milestoneIndex: number;
};

export type SuggestedMilestone = {
  id: string;
  title: string;
  phase: string;
  description: string;
  order: number;
  paymentPercentage: number;
  paymentAmount: number;
  targetWeek: number;
};

export type SuggestedProjectPlan = {
  scopeItems: ScopeItem[];
  milestones: SuggestedMilestone[];
  deliverables: SuggestedDeliverable[];
  tasks: SuggestedTask[];
  estimatedTotalHours: number;
  targetTimelineWeeks: number;
};

export type NextBestAction = {
  id: string;
  type: "ASSIGN_TEAM" | "START_MILESTONE" | "INTERNAL_REVIEW" | "SUBMIT_DELIVERABLE" | "REVIEW_CHANGE_REQUEST" | "TRIGGER_INVOICE" | "COMPLETE_PROJECT";
  title: string;
  description: string;
  actionLabel: string;
  actionPayload?: Record<string, unknown>;
  priority: "HIGH" | "MEDIUM" | "INFO";
};

/* ── Code generator ───────────────────────────────────────────── */

export async function nextProjectCode(workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.clientProject.count({
    where: { client: { workspaceId } },
  });
  return `PRJ-${year}-${String(count + 1).padStart(3, "0")}`;
}

/* ── Scope & Plan Extractor from Approved Proposal ────────────── */

export function extractApprovedScopeAndPlan(
  proposal: {
    id: string;
    title: string;
    reference?: string | null;
    amount?: number | null;
    currency?: string;
    document?: string | null;
  },
  requirementFeatures: Array<{ name: string; priority: string; description?: string; acceptanceCriteria?: string }> = [],
): SuggestedProjectPlan {
  let doc: ProposalDoc = {
    meta: {
      title: proposal.title,
      reference: proposal.reference || "PROP",
      clientName: "Client",
      preparedBy: "Enterprise Delivery Team",
      preparedFor: null,
      amount: proposal.amount ?? null,
      currency: proposal.currency || "INR",
      amountLabel: "Standard",
      timelineLabel: "8 Weeks",
      date: new Date().toISOString(),
    },
    version: 1,
    sections: [],
  };
  try {
    if (proposal.document) {
      doc = JSON.parse(proposal.document);
    }
  } catch {}

  const scopeItems: ScopeItem[] = [];
  const budget = proposal.amount || 100000;

  // 1. Extract objectives & features
  requirementFeatures.forEach((rf, idx) => {
    let parsedCriteria: string[] = [];
    try {
      if (rf.acceptanceCriteria) {
        parsedCriteria = JSON.parse(rf.acceptanceCriteria);
      }
    } catch {}
    if (parsedCriteria.length === 0) {
      parsedCriteria = [
        `Verified functional operation of ${rf.name} according to client specifications.`,
        `Zero critical severity defects during user acceptance testing.`,
      ];
    }

    scopeItems.push({
      id: `scope-feat-${idx + 1}`,
      category: "FEATURE",
      title: rf.name,
      detail: rf.description || `Core functional capability specified in approved requirement.`,
      priority: (rf.priority as any) || "HIGH",
      included: true,
      sourceSection: "Approved Requirement",
      acceptanceCriteria: parsedCriteria,
    });
  });

  // Extract from proposal doc blocks
  (doc.sections || []).forEach((sec) => {
    (sec.blocks || []).forEach((b, bIdx) => {
      if (b.type === "feature_card" && b.title) {
        if (!scopeItems.some((s) => s.title.toLowerCase() === b.title.toLowerCase())) {
          scopeItems.push({
            id: `scope-doc-feat-${bIdx}`,
            category: "FEATURE",
            title: b.title,
            detail: b.purpose || b.businessNeed || "Proposal feature module",
            priority: (b.priority as any) || "HIGH",
            included: true,
            sourceSection: sec.title,
            acceptanceCriteria: b.acceptanceCriteria || [`Feature fulfillment for ${b.title}`],
          });
        }
      } else if (b.type === "deliverable" && b.name) {
        scopeItems.push({
          id: `scope-doc-deliv-${bIdx}`,
          category: "DELIVERABLE",
          title: b.name,
          detail: b.description || b.scope || "Proposal deliverable item",
          priority: "HIGH",
          included: true,
          sourceSection: sec.title,
          acceptanceCriteria: b.acceptance ? [b.acceptance] : [`Formal acceptance sign-off on ${b.name}`],
        });
      }
    });
  });

  if (scopeItems.length === 0) {
    scopeItems.push(
      {
        id: "scope-default-1",
        category: "OBJECTIVE",
        title: "Enterprise Platform Deployment",
        detail: "Full system configuration and deployment for client operations.",
        priority: "HIGH",
        included: true,
        acceptanceCriteria: ["Production environment active with HTTPS and SSL."],
      },
      {
        id: "scope-default-2",
        category: "FEATURE",
        title: "Workflow Automation & Management Engine",
        detail: "Streamlined end-to-end task and record management.",
        priority: "HIGH",
        included: true,
        acceptanceCriteria: ["100% test pass rate on primary business flows."],
      },
    );
  }

  // 2. Build Structured Milestones
  const milestones: SuggestedMilestone[] = [
    {
      id: "ms-1",
      title: "Phase 1: Architecture & Foundation Kickoff",
      phase: "PHASE_1",
      description: "Technical environment setup, database schema validation, and baseline architecture deployment.",
      order: 1,
      paymentPercentage: 30,
      paymentAmount: Math.round(budget * 0.3),
      targetWeek: 2,
    },
    {
      id: "ms-2",
      title: "Phase 2: Core Engineering & Feature Delivery",
      phase: "PHASE_2",
      description: "Implementation of approved functional features, API endpoints, and user interfaces.",
      order: 2,
      paymentPercentage: 40,
      paymentAmount: Math.round(budget * 0.4),
      targetWeek: 5,
    },
    {
      id: "ms-3",
      title: "Phase 3: Integration, QA & User Acceptance (UAT)",
      phase: "PHASE_3",
      description: "End-to-end testing, security audits, and collaborative client sandbox verification.",
      order: 3,
      paymentPercentage: 20,
      paymentAmount: Math.round(budget * 0.2),
      targetWeek: 7,
    },
    {
      id: "ms-4",
      title: "Phase 4: Production Cutover & Handover",
      phase: "PHASE_4",
      description: "Final release deployment, administrative training walkthrough, and warranty activation.",
      order: 4,
      paymentPercentage: 10,
      paymentAmount: Math.round(budget * 0.1),
      targetWeek: 8,
    },
  ];

  // 3. Build Structured Deliverables from Scope
  const deliverables: SuggestedDeliverable[] = [
    {
      id: "deliv-1",
      title: "System Architecture & Security Specification",
      description: "Database schemas, API documentation, authentication guardrails, and cloud deployment topology.",
      category: "ARCHITECTURE",
      acceptanceCriteria: [
        "Database schema verified with foreign key integrity and indexing.",
        "Role-based access control (RBAC) configured and tested.",
      ],
      milestoneIndex: 0,
    },
    ...scopeItems.slice(0, 4).map((item, idx) => ({
      id: `deliv-feat-${idx + 1}`,
      title: item.title,
      description: item.detail,
      category: "ENGINEERING",
      proposalFeatureName: item.title,
      acceptanceCriteria: item.acceptanceCriteria && item.acceptanceCriteria.length > 0
        ? item.acceptanceCriteria
        : [`Verified functional implementation of ${item.title}`],
      milestoneIndex: 1,
    })),
    {
      id: "deliv-qa",
      title: "Quality Assurance & UAT Acceptance Suite",
      description: "Comprehensive test execution report, issue resolution logs, and client acceptance confirmation.",
      category: "QA",
      acceptanceCriteria: [
        "Zero open blocking or high severity defects.",
        "Formal client stakeholder sign-off on staging environment.",
      ],
      milestoneIndex: 2,
    },
    {
      id: "deliv-handover",
      title: "Production System Handover & Operational Manual",
      description: "Production cutover, system documentation, admin guides, and 30-day warranty initiation.",
      category: "DOCUMENTATION",
      acceptanceCriteria: [
        "Production environment accessible on client domain.",
        "Administrator knowledge transfer session completed.",
      ],
      milestoneIndex: 3,
    },
  ];

  // 4. Build Structured Tasks
  const tasks: SuggestedTask[] = [
    // Phase 1 Tasks
    { id: "task-1", title: "Initialize repository, CI/CD pipeline, and staging environments", teamRole: "Solutions Architect", estimatedHours: 12, priority: "HIGH", milestoneIndex: 0, deliverableIndex: 0 },
    { id: "task-2", title: "Implement relational database schemas and Prisma migration scripts", teamRole: "Lead Engineer", estimatedHours: 16, priority: "HIGH", milestoneIndex: 0, deliverableIndex: 0 },
    { id: "task-3", title: "Configure authentication, session tokens, and security middleware", teamRole: "Lead Engineer", estimatedHours: 14, priority: "HIGH", milestoneIndex: 0, deliverableIndex: 0 },

    // Phase 2 Tasks
    ...deliverables.filter((d) => d.category === "ENGINEERING").flatMap((d, dIdx) => [
      { id: `task-feat-ui-${dIdx}`, title: `Design & build UI components for ${d.title}`, teamRole: "Frontend Engineer", estimatedHours: 18, priority: "HIGH" as const, milestoneIndex: 1, deliverableIndex: dIdx + 1 },
      { id: `task-feat-api-${dIdx}`, title: `Implement API routes, business logic & validation for ${d.title}`, teamRole: "Backend Engineer", estimatedHours: 20, priority: "HIGH" as const, milestoneIndex: 1, deliverableIndex: dIdx + 1 },
      { id: `task-feat-test-${dIdx}`, title: `Write unit & integration tests for ${d.title}`, teamRole: "QA Specialist", estimatedHours: 10, priority: "MEDIUM" as const, milestoneIndex: 1, deliverableIndex: dIdx + 1 },
    ]),

    // Phase 3 Tasks
    { id: "task-qa-1", title: "Execute end-to-end regression testing and cross-browser verification", teamRole: "QA Specialist", estimatedHours: 20, priority: "HIGH", milestoneIndex: 2, deliverableIndex: deliverables.length - 2 },
    { id: "task-qa-2", title: "Conduct client UAT walkthrough and resolve feedback items", teamRole: "Project Manager", estimatedHours: 12, priority: "HIGH", milestoneIndex: 2, deliverableIndex: deliverables.length - 2 },

    // Phase 4 Tasks
    { id: "task-prod-1", title: "Execute production deployment cutover and DNS verification", teamRole: "DevOps Engineer", estimatedHours: 8, priority: "HIGH", milestoneIndex: 3, deliverableIndex: deliverables.length - 1 },
    { id: "task-prod-2", title: "Deliver admin documentation and complete final project sign-off", teamRole: "Project Manager", estimatedHours: 6, priority: "MEDIUM", milestoneIndex: 3, deliverableIndex: deliverables.length - 1 },
  ];

  const estimatedTotalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    scopeItems,
    milestones,
    deliverables,
    tasks,
    estimatedTotalHours,
    targetTimelineWeeks: 8,
  };
}

/* ── Project Detail & Live Metrics ────────────────────────────── */

export async function getProjectForUser(userId: string, projectId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true } });
  if (!user?.workspace) return null;

  return db.clientProject.findFirst({
    where: {
      id: projectId,
      client: { workspaceId: user.workspace.id },
    },
    include: {
      client: {
        include: {
          contacts: { where: { isPrimary: true } },
        },
      },
      proposal: {
        include: {
          approvals: { orderBy: { approvedAt: "desc" }, take: 1 },
          versions: { orderBy: { version: "desc" } },
        },
      },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          deliverables: true,
          tasks: true,
        },
      },
      deliverables: {
        include: {
          tasks: true,
          changeRequests: true,
        },
      },
      tasks: {
        orderBy: { createdAt: "asc" },
      },
      team: {
        orderBy: { joinedAt: "asc" },
      },
      changeRequests: {
        orderBy: { submittedAt: "desc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
}

/* ── Compute Dynamic Metrics & Next Best Action ───────────────── */

export function computeProjectHealthAndActions(project: any): {
  progress: number;
  completedTasks: number;
  totalTasks: number;
  acceptedDeliverables: number;
  totalDeliverables: number;
  currentMilestone: any | null;
  nextBestAction: NextBestAction;
} {
  const tasks = project.tasks || [];
  const deliverables = project.deliverables || [];
  const milestones = project.milestones || [];
  const changeRequests = project.changeRequests || [];

  const completedTasks = tasks.filter((t: any) => t.status === "DONE").length;
  const totalTasks = tasks.length;

  const acceptedDeliverables = deliverables.filter((d: any) => d.status === "ACCEPTED").length;
  const totalDeliverables = deliverables.length;

  // Calculate honest weighted progress: 50% task progress + 50% deliverable acceptance
  const taskPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const deliverablePct = totalDeliverables > 0 ? (acceptedDeliverables / totalDeliverables) * 100 : 0;
  const progress = Math.round(totalDeliverables > 0 ? taskPct * 0.4 + deliverablePct * 0.6 : taskPct);

  // Determine current active milestone
  const currentMilestone = milestones.find((m: any) => m.status === "IN_PROGRESS" || m.status === "IN_REVIEW") ||
    milestones.find((m: any) => m.status === "PLANNED") ||
    milestones[milestones.length - 1] || null;

  // Calculate Next Best Action dynamically
  let nextBestAction: NextBestAction;

  const pendingChangeRequests = changeRequests.filter((cr: any) => cr.status === "SUBMITTED" || cr.status === "UNDER_REVIEW");
  const unassignedTasks = tasks.filter((t: any) => !t.assigneeName && t.status !== "DONE");
  const deliverablesInClientReview = deliverables.filter((d: any) => d.status === "CLIENT_REVIEW" || d.status === "DELIVERED_TO_CLIENT");
  const deliverablesReadyForReview = deliverables.filter((d: any) => d.status === "INTERNAL_REVIEW");

  if (pendingChangeRequests.length > 0) {
    nextBestAction = {
      id: "nba-cr",
      type: "REVIEW_CHANGE_REQUEST",
      title: "Client Change Request Awaiting Review",
      description: `Client requested modifications to "${pendingChangeRequests[0].title}". Assess impact on timeline and budget.`,
      actionLabel: "Review Change Request",
      priority: "HIGH",
      actionPayload: { changeRequestId: pendingChangeRequests[0].id },
    };
  } else if (unassignedTasks.length > 0) {
    nextBestAction = {
      id: "nba-assign",
      type: "ASSIGN_TEAM",
      title: `${unassignedTasks.length} Tasks Need Assignment`,
      description: "Assign workspace team members to unallocated tasks to maintain milestone delivery velocity.",
      actionLabel: "Assign Team Members",
      priority: "MEDIUM",
    };
  } else if (deliverablesReadyForReview.length > 0) {
    nextBestAction = {
      id: "nba-review",
      type: "INTERNAL_REVIEW",
      title: `Internal Review Required for "${deliverablesReadyForReview[0].title}"`,
      description: "Engineering tasks complete. Review deliverable criteria before submitting to client for sign-off.",
      actionLabel: "Complete Internal Review",
      priority: "HIGH",
      actionPayload: { deliverableId: deliverablesReadyForReview[0].id },
    };
  } else if (deliverablesInClientReview.length > 0) {
    nextBestAction = {
      id: "nba-client-review",
      type: "SUBMIT_DELIVERABLE",
      title: "Deliverable Under Client Review",
      description: `"${deliverablesInClientReview[0].title}" has been delivered. Awaiting client formal acceptance.`,
      actionLabel: "View Deliverable Status",
      priority: "INFO",
      actionPayload: { deliverableId: deliverablesInClientReview[0].id },
    };
  } else if (acceptedDeliverables === totalDeliverables && totalDeliverables > 0) {
    nextBestAction = {
      id: "nba-complete",
      type: "COMPLETE_PROJECT",
      title: "All Deliverables Formally Accepted!",
      description: "All client acceptance criteria verified. Complete the project and trigger the final handover invoice.",
      actionLabel: "Finalize & Complete Project",
      priority: "HIGH",
    };
  } else {
    nextBestAction = {
      id: "nba-progress",
      type: "START_MILESTONE",
      title: `Executing ${currentMilestone?.title || "Active Phase"}`,
      description: `${completedTasks} of ${totalTasks} tasks completed. Continue sprint execution toward the next phase gate.`,
      actionLabel: "View Active Tasks",
      priority: "INFO",
    };
  }

  return {
    progress,
    completedTasks,
    totalTasks,
    acceptedDeliverables,
    totalDeliverables,
    currentMilestone,
    nextBestAction,
  };
}

/* ── Launch Project from Approved Proposal ─────────────────────── */

export async function launchProjectFromApprovedProposal(input: {
  workspaceId: string;
  userId: string;
  userName: string;
  clientId: string;
  proposalId: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  startDate?: string;
  targetCompletion?: string;
  budget?: number;
  currency?: string;
  scopeItems: ScopeItem[];
  milestones: SuggestedMilestone[];
  deliverables: SuggestedDeliverable[];
  tasks: SuggestedTask[];
  teamMembers?: Array<{ name: string; role: string; email?: string; userId?: string }>;
}) {
  const client = await db.client.findFirst({
    where: { id: input.clientId, workspaceId: input.workspaceId },
  });
  if (!client) throw new Error("Client not found.");

  const proposal = await db.clientProposal.findFirst({
    where: { id: input.proposalId, clientId: input.clientId },
  });
  if (!proposal) throw new Error("Proposal not found.");

  const now = new Date();
  const startDate = input.startDate ? new Date(input.startDate) : now;
  const deadline = input.targetCompletion ? new Date(input.targetCompletion) : new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);

  return db.$transaction(async (tx) => {
    // 1. Create Project
    const project = await tx.clientProject.create({
      data: {
        clientId: input.clientId,
        proposalId: input.proposalId,
        proposalVersion: proposal.version,
        requirementRequestId: proposal.requirementRequestId,
        name: input.name,
        code: input.code,
        description: input.description || `Delivery project established from approved proposal "${proposal.title}".`,
        stage: "PLANNING",
        health: "ON_TRACK",
        progress: 0,
        budget: input.budget ?? proposal.amount ?? 0,
        currency: input.currency ?? proposal.currency ?? "INR",
        managerId: input.managerId,
        managerName: input.managerName || input.userName,
        startedAt: startDate,
        deadline: deadline,
        targetCompletion: deadline,
        scopeSnapshot: JSON.stringify(input.scopeItems.filter((s) => s.included)),
      },
    });

    // 2. Create Milestones
    const createdMilestones = await Promise.all(
      input.milestones.map((m, idx) => {
        const msTarget = new Date(startDate.getTime() + m.targetWeek * 7 * 24 * 60 * 60 * 1000);
        return tx.projectMilestone.create({
          data: {
            projectId: project.id,
            title: m.title,
            phase: m.phase || `PHASE_${idx + 1}`,
            description: m.description,
            order: idx + 1,
            status: idx === 0 ? "IN_PROGRESS" : "PLANNED",
            progress: 0,
            targetDate: msTarget,
            paymentPercentage: m.paymentPercentage,
            paymentAmount: m.paymentAmount,
            invoiceStatus: "UNINVOICED",
          },
        });
      }),
    );

    // 3. Create Deliverables
    const createdDeliverables = await Promise.all(
      input.deliverables.map((d) => {
        const milestone = createdMilestones[d.milestoneIndex] ?? createdMilestones[0];
        return tx.projectDeliverable.create({
          data: {
            projectId: project.id,
            milestoneId: milestone?.id,
            title: d.title,
            description: d.description,
            category: d.category || "ENGINEERING",
            proposalFeatureName: d.proposalFeatureName,
            acceptanceCriteria: JSON.stringify(d.acceptanceCriteria || []),
            status: "DRAFT",
          },
        });
      }),
    );

    // 4. Create Tasks
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
    await Promise.all(
      input.tasks.map((t, idx) => {
        const milestone = createdMilestones[t.milestoneIndex] ?? createdMilestones[0];
        const deliverable = t.deliverableIndex !== undefined ? createdDeliverables[t.deliverableIndex] : undefined;
        const priority = validPriorities.includes(t.priority as any) ? (t.priority as any) : "MEDIUM";
        
        let ws = "FRONTEND";
        const titleLower = t.title.toLowerCase();
        if (titleLower.includes("database") || titleLower.includes("schema")) ws = "DATABASE";
        else if (titleLower.includes("auth") || titleLower.includes("security") || titleLower.includes("api") || titleLower.includes("backend")) ws = "BACKEND";
        else if (titleLower.includes("test") || titleLower.includes("qa") || titleLower.includes("regression")) ws = "QA";
        else if (titleLower.includes("deploy") || titleLower.includes("cutover") || titleLower.includes("devops")) ws = "DEPLOYMENT";
        else if (titleLower.includes("design") || titleLower.includes("wireframe") || titleLower.includes("ui/ux")) ws = "DESIGN";
        else if (titleLower.includes("uat") || titleLower.includes("walkthrough") || titleLower.includes("handover")) ws = "CLIENT_REVIEW";

        return tx.clientTask.create({
          data: {
            code: `TSK-${String(idx + 1).padStart(3, "0")}`,
            clientId: input.clientId,
            projectId: project.id,
            milestoneId: milestone?.id,
            deliverableId: deliverable?.id,
            title: t.title,
            description: t.description,
            workstream: ws,
            teamRole: t.teamRole,
            estimatedHours: t.estimatedHours,
            priority,
            status: "TODO",
            order: idx + 1,
            sourceType: "PROPOSAL_SCOPE",
            sourceDeliverableTitle: deliverable?.title || null,
            sourceProposalId: proposal.id,
            sourceSection: milestone?.title || "Approved Proposal",
          },
        });
      }),
    );

    // 5. Create Team Members
    const defaultTeam = input.teamMembers && input.teamMembers.length > 0
      ? input.teamMembers
      : [
          { name: input.managerName || input.userName, role: "Project Manager", userId: input.userId },
          { name: "Senior Full-Stack Engineer", role: "Lead Engineer" },
          { name: "UI/UX & Product Designer", role: "Product Designer" },
          { name: "Quality Assurance Specialist", role: "QA Engineer" },
        ];

    await Promise.all(
      defaultTeam.map((member) =>
        tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: member.userId,
            name: member.name,
            role: member.role,
            email: member.email,
            allocation: 100,
          },
        }),
      ),
    );

    // 6. Record Initial Project Activity
    await tx.projectActivity.create({
      data: {
        projectId: project.id,
        type: "PROJECT_CREATED",
        title: "Project Launched from Approved Proposal",
        detail: `Project ${project.code} initialized from proposal "${proposal.title}" (v${proposal.version}). ${createdMilestones.length} milestones, ${createdDeliverables.length} deliverables, and ${input.tasks.length} tasks generated.`,
        actorName: input.userName,
      },
    });

    // 7. Update Client Stage to PROJECT
    await tx.client.update({
      where: { id: input.clientId },
      data: { stage: "PROJECT", lastActivityAt: now },
    });

    // 8. Record Workspace Audit Log
    await recordAudit({
      clientId: input.clientId,
      entity: "PROJECT",
      action: "PROJECT_CREATED",
      entityId: project.id,
      actorId: input.userId,
      actorName: input.userName,
      after: { projectId: project.id, code: project.code, proposalId: proposal.id },
    });

    return project;
  });
}

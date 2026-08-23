import { db } from "./db";
import { recordAudit } from "./clients";
import type { ProposalDoc } from "./proposal-doc";

// Re-export browser-safe constants so server-side code that already imports
// from "@/lib/tasks" continues to work unchanged.
// CommandCenterMetrics is defined locally below (richer server-side shape).
export type { WorkstreamType, TaskStatusType } from "./tasks-types";
export { ALL_WORKSTREAMS, TASK_STATUS_CONFIG } from "./tasks-types";

// Private imports for use within this server-only module.
import { ALL_WORKSTREAMS } from "./tasks-types";
import type { WorkstreamType, CommandCenterMetrics } from "./tasks-types";
// Re-export CommandCenterMetrics so server-side callers (API routes) can use it.
export type { CommandCenterMetrics } from "./tasks-types";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — TASK OPERATING SYSTEM / EXECUTION BRAIN
   The central execution engine transforming approved client
   commitments into fully traceable, executable work.

   Hierarchy:
   CLIENT -> LEAD -> REQUIREMENT -> REQUIREMENT REVIEW
   -> APPROVED REQUIREMENT -> PROPOSAL -> APPROVED PROPOSAL VERSION
   -> APPROVED SCOPE -> PROJECT -> PROJECT PLAN
   -> PHASE -> MILESTONE -> DELIVERABLE -> WORKSTREAM
   -> TASK -> SUBTASK -> EMPLOYEE -> EXECUTION
   -> INTERNAL REVIEW -> CLIENT REVIEW -> CLIENT ACCEPTANCE -> COMPLETION
──────────────────────────────────────────────────────────────── */

/* ── Code Generator ───────────────────────────────────────────── */
export async function nextTaskCode(workspaceId: string): Promise<string> {
  const count = await db.clientTask.count({
    where: { client: { workspaceId } },
  });
  return `TSK-${String(count + 1).padStart(3, "0")}`;
}

/* ── Work DNA: Signature Feature ──────────────────────────────── */
export type WorkDNA = {
  client: {
    id: string;
    companyName: string;
    industry: string | null;
    stage: string;
  };
  lead?: {
    source: string | null;
    score: number | null;
  };
  requirement?: {
    id: string;
    reference: string;
    title: string;
    status: string;
    approvedAt: Date | null;
  };
  requirementReview?: {
    completeness: number;
    readiness: number;
  };
  proposal?: {
    id: string;
    reference: string | null;
    title: string;
    version: number;
    status: string;
    amount: number | null;
    currency: string;
  };
  proposalVersion?: {
    version: number;
    approvedAt: Date | null;
    finalizedAt: Date | null;
  };
  scope?: {
    title: string | null;
    category: string | null;
    sourceSection: string | null;
  };
  project: {
    id: string;
    code: string | null;
    name: string;
    stage: string;
    health: string;
    progress: number;
  };
  milestone?: {
    id: string;
    title: string;
    phase: string;
    order: number;
    status: string;
    targetDate: Date | null;
  };
  deliverable?: {
    id: string;
    title: string;
    category: string | null;
    status: string;
    acceptanceCriteria: string[];
    clientApprovedAt: Date | null;
  };
  workstream: {
    id: string;
    label: string;
    color: string;
  };
  task: {
    id: string;
    code: string | null;
    title: string;
    description: string | null;
    expectedResult: string | null;
    status: string;
    priority: string;
    clientVisibility: string;
    dueAt: Date | null;
    progress: number;
  };
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    assigneeName: string | null;
  }>;
  acceptanceCriteria: Array<{
    id: string;
    criterion: string;
    status: string;
    notes: string | null;
  }>;
  employee?: {
    id: string | null;
    name: string | null;
    role: string | null;
    email: string | null;
  };
  dependencies: {
    upstream: Array<{ id: string; code: string | null; title: string; status: string; assigneeName: string | null }>;
    downstream: Array<{ id: string; code: string | null; title: string; status: string; assigneeName: string | null }>;
    isBlockedByUpstream: boolean;
  };
  reviews: Array<{
    id: string;
    reviewerName: string;
    status: string;
    feedback: string | null;
    submittedAt: Date;
    decidedAt: Date | null;
  }>;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    detail: string | null;
    actorName: string | null;
    createdAt: Date;
  }>;
};

export async function getTaskWorkDNA(taskId: string): Promise<WorkDNA | null> {
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: {
      client: true,
      project: {
        include: {
          proposal: {
            include: {
              approvals: { orderBy: { approvedAt: "desc" }, take: 1 },
              versions: { orderBy: { version: "desc" }, take: 1 },
            },
          },
          milestones: true,
          deliverables: true,
          team: true,
        },
      },
      milestone: true,
      deliverable: true,
      subtasks: { orderBy: { order: "asc" } },
      acceptanceCriteria: { orderBy: { order: "asc" } },
      dependencies: {
        include: {
          dependsOnTask: true,
        },
      },
      dependentOnMe: {
        include: {
          task: true,
        },
      },
      reviews: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 25 },
      comments: { orderBy: { createdAt: "desc" } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task || !task.client || !task.project) return null;

  // Find linked requirement request if any
  let requirementRequest: any = null;
  if (task.sourceRequirementId) {
    requirementRequest = await db.requirementRequest.findUnique({
      where: { id: task.sourceRequirementId },
      include: { features: true },
    });
  } else if (task.project.requirementRequestId) {
    requirementRequest = await db.requirementRequest.findUnique({
      where: { id: task.project.requirementRequestId },
      include: { features: true },
    });
  }

  // Workstream lookup
  const ws = ALL_WORKSTREAMS.find((w) => w.id === task.workstream) || {
    id: task.workstream || "FRONTEND",
    label: task.workstream || "Frontend",
    color: "#0ea5e9",
  };

  // Upstream blockers
  const upstream = task.dependencies.map((d) => ({
    id: d.dependsOnTask.id,
    code: d.dependsOnTask.code,
    title: d.dependsOnTask.title,
    status: d.dependsOnTask.status,
    assigneeName: d.dependsOnTask.assigneeName,
  }));

  const isBlockedByUpstream = upstream.some(
    (u) => u.status !== "COMPLETED" && u.status !== "DONE" && u.status !== "CLIENT_APPROVED",
  );

  const downstream = task.dependentOnMe.map((d) => ({
    id: d.task.id,
    code: d.task.code,
    title: d.task.title,
    status: d.task.status,
    assigneeName: d.task.assigneeName,
  }));

  // Parse deliverable acceptance criteria
  let deliverableCriteria: string[] = [];
  try {
    if (task.deliverable?.acceptanceCriteria) {
      deliverableCriteria = JSON.parse(task.deliverable.acceptanceCriteria);
    }
  } catch {}

  // Calculate task progress
  const totalSub = task.subtasks.length;
  const completedSub = task.subtasks.filter((s) => s.completed).length;
  const subProgress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : (task.status === "COMPLETED" || task.status === "DONE" ? 100 : 0);

  // Employee details from team or user
  const assignedMember = task.project.team?.find(
    (m) => m.name === task.assigneeName || m.userId === task.assigneeId,
  );

  return {
    client: {
      id: task.client.id,
      companyName: task.client.companyName,
      industry: task.client.industry,
      stage: task.client.stage,
    },
    lead: {
      source: task.client.leadSource,
      score: task.client.leadScore,
    },
    requirement: requirementRequest
      ? {
          id: requirementRequest.id,
          reference: requirementRequest.reference,
          title: requirementRequest.title,
          status: requirementRequest.status,
          approvedAt: requirementRequest.approvedAt,
        }
      : undefined,
    requirementReview: requirementRequest
      ? {
          completeness: requirementRequest.completeness,
          readiness: requirementRequest.readiness,
        }
      : undefined,
    proposal: task.project.proposal
      ? {
          id: task.project.proposal.id,
          reference: task.project.proposal.reference,
          title: task.project.proposal.title,
          version: task.project.proposal.version,
          status: task.project.proposal.status,
          amount: task.project.proposal.amount,
          currency: task.project.proposal.currency,
        }
      : undefined,
    proposalVersion: task.project.proposal?.versions?.[0]
      ? {
          version: task.project.proposal.versions[0].version,
          approvedAt: task.project.proposal.versions[0].approvedAt,
          finalizedAt: task.project.proposal.versions[0].finalizedAt,
        }
      : undefined,
    scope: {
      title: task.sourceScopeItem || task.deliverable?.title || task.title,
      category: task.deliverable?.category || task.workstream || "ENGINEERING",
      sourceSection: task.sourceSection || "Approved Scope",
    },
    project: {
      id: task.project.id,
      code: task.project.code,
      name: task.project.name,
      stage: task.project.stage,
      health: task.project.health,
      progress: task.project.progress,
    },
    milestone: task.milestone
      ? {
          id: task.milestone.id,
          title: task.milestone.title,
          phase: task.milestone.phase,
          order: task.milestone.order,
          status: task.milestone.status,
          targetDate: task.milestone.targetDate,
        }
      : undefined,
    deliverable: task.deliverable
      ? {
          id: task.deliverable.id,
          title: task.deliverable.title,
          category: task.deliverable.category,
          status: task.deliverable.status,
          acceptanceCriteria: deliverableCriteria,
          clientApprovedAt: task.deliverable.clientApprovedAt,
        }
      : undefined,
    workstream: ws,
    task: {
      id: task.id,
      code: task.code,
      title: task.title,
      description: task.description,
      expectedResult: task.expectedResult,
      status: task.status,
      priority: task.priority,
      clientVisibility: task.clientVisibility,
      dueAt: task.dueAt,
      progress: subProgress,
    },
    subtasks: task.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      completed: s.completed,
      assigneeName: s.assigneeName,
    })),
    acceptanceCriteria: task.acceptanceCriteria.map((c) => ({
      id: c.id,
      criterion: c.criterion,
      status: c.status,
      notes: c.notes,
    })),
    employee: {
      id: task.assigneeId,
      name: task.assigneeName,
      role: task.teamRole || assignedMember?.role || null,
      email: assignedMember?.email || null,
    },
    dependencies: {
      upstream,
      downstream,
      isBlockedByUpstream,
    },
    reviews: task.reviews.map((r) => ({
      id: r.id,
      reviewerName: r.reviewerName,
      status: r.status,
      feedback: r.feedback,
      submittedAt: r.submittedAt,
      decidedAt: r.decidedAt,
    })),
    activities: task.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      detail: a.detail,
      actorName: a.actorName,
      createdAt: a.createdAt,
    })),
  };
}

/* ── Task State Machine & Transition Validator ────────────────── */
export function validateTaskTransition(
  task: {
    status: string;
    subtasks?: Array<{ completed: boolean }>;
    acceptanceCriteria?: Array<{ status: string }>;
    dependencies?: Array<{ dependsOnTask: { status: string; title: string } }>;
  },
  nextStatus: string,
): { valid: boolean; error?: string } {
  // If moving to COMPLETED or DONE, check acceptance criteria
  if (nextStatus === "COMPLETED" || nextStatus === "DONE") {
    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      const pendingCriteria = task.acceptanceCriteria.filter(
        (c) => c.status === "NOT_STARTED" || c.status === "FAILED",
      );
      if (pendingCriteria.length > 0) {
        return {
          valid: false,
          error: `Cannot complete task: ${pendingCriteria.length} acceptance criteria have not passed.`,
        };
      }
    }

    if (task.subtasks && task.subtasks.length > 0) {
      const incompleteSubtasks = task.subtasks.filter((s) => !s.completed);
      if (incompleteSubtasks.length > 0) {
        return {
          valid: false,
          error: `Cannot complete task: ${incompleteSubtasks.length} subtasks are still pending.`,
        };
      }
    }
  }

  // If moving to IN_PROGRESS or READY, check for unfinished blocking dependencies
  if (nextStatus === "IN_PROGRESS" || nextStatus === "READY") {
    if (task.dependencies && task.dependencies.length > 0) {
      const incompleteBlockers = task.dependencies.filter(
        (d) =>
          d.dependsOnTask.status !== "COMPLETED" &&
          d.dependsOnTask.status !== "DONE" &&
          d.dependsOnTask.status !== "CLIENT_APPROVED",
      );
      if (incompleteBlockers.length > 0 && nextStatus === "IN_PROGRESS") {
        // Warning or blocking - allow user to force with warning, but block invalid jump
      }
    }
  }

  return { valid: true };
}

/* ── Deliverable Automation Engine ────────────────────────────── */
export async function checkAndAdvanceDeliverable(deliverableId: string, actorName: string = "System") {
  const deliverable = await db.projectDeliverable.findUnique({
    where: { id: deliverableId },
    include: {
      tasks: {
        include: {
          acceptanceCriteria: true,
        },
      },
      project: true,
    },
  });

  if (!deliverable || deliverable.tasks.length === 0) return;

  const allTasksCompleted = deliverable.tasks.every(
    (t) => t.status === "COMPLETED" || t.status === "DONE" || t.status === "CLIENT_APPROVED",
  );

  const allCriteriaPassed = deliverable.tasks.every((t) =>
    t.acceptanceCriteria.every((c) => c.status === "PASSED" || c.status === "NOT_APPLICABLE"),
  );

  if (allTasksCompleted && allCriteriaPassed && deliverable.status === "DRAFT") {
    await db.projectDeliverable.update({
      where: { id: deliverableId },
      data: {
        status: "INTERNAL_REVIEW",
        submittedAt: new Date(),
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: deliverable.projectId,
        type: "DELIVERABLE_READY",
        title: `Deliverable Ready for Internal Review: "${deliverable.title}"`,
        detail: `All ${deliverable.tasks.length} tasks completed with passing acceptance criteria. Ready for manager sign-off.`,
        actorName,
      },
    });
  }
}

/* ── Work Breakdown Builder & Plan Review Engine ─────────────── */
export type WorkBreakdownPreview = {
  projectId: string;
  projectName: string;
  clientName: string;
  whatWasUnderstood: Array<{
    title: string;
    detail: string;
    category: string;
    source: string;
  }>;
  recommendedPhases: Array<{
    phase: string;
    title: string;
    description: string;
    order: number;
    targetWeek: number;
  }>;
  recommendedDeliverables: Array<{
    title: string;
    description: string;
    category: string;
    milestoneIndex: number;
    acceptanceCriteria: string[];
    sourceRequirementTitle?: string;
  }>;
  recommendedWorkstreams: Array<{
    id: WorkstreamType;
    label: string;
    color: string;
    taskCount: number;
  }>;
  recommendedTasks: Array<{
    code: string;
    title: string;
    description: string;
    workstream: WorkstreamType;
    teamRole: string;
    estimatedHours: number;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    milestoneIndex: number;
    deliverableIndex?: number;
    sourceRequirementTitle?: string;
    sourceSection?: string;
    acceptanceCriteria: string[];
    subtasks: string[];
    dependsOnTaskIndex?: number;
  }>;
};

export async function generateWorkBreakdownPlan(projectId: string): Promise<WorkBreakdownPreview | null> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      proposal: true,
      milestones: true,
      deliverables: true,
    },
  });

  if (!project) return null;

  // Retrieve requirement features if requirement request exists
  let requirementFeatures: any[] = [];
  if (project.requirementRequestId) {
    const req = await db.requirementRequest.findUnique({
      where: { id: project.requirementRequestId },
      include: { features: true },
    });
    if (req?.features) {
      requirementFeatures = req.features;
    }
  }

  // Parse proposal document JSON
  let doc: ProposalDoc = {
    meta: {
      title: project.proposal?.title || project.name,
      reference: project.proposal?.reference || "PROP",
      clientName: project.client.companyName,
      preparedBy: "Business OS Delivery Team",
      preparedFor: null,
      amount: project.budget ?? null,
      currency: project.currency || "INR",
      amountLabel: "Standard",
      timelineLabel: "8 Weeks",
      date: new Date().toISOString(),
    },
    version: 1,
    sections: [],
  };

  try {
    if (project.proposal?.document) {
      doc = JSON.parse(project.proposal.document);
    }
  } catch {}

  const whatWasUnderstood: Array<{
    title: string;
    detail: string;
    category: string;
    source: string;
  }> = [];

  // Extract from verified requirements
  requirementFeatures.forEach((rf) => {
    whatWasUnderstood.push({
      title: rf.name,
      detail: rf.description || `Core requirement feature specified by ${project.client.companyName}.`,
      category: "VERIFIED_FEATURE",
      source: "Verified Client Requirement",
    });
  });

  // Extract from proposal blocks
  (doc.sections || []).forEach((sec) => {
    (sec.blocks || []).forEach((b) => {
      if (b.type === "feature_card" && b.title) {
        if (!whatWasUnderstood.some((u) => u.title.toLowerCase() === b.title.toLowerCase())) {
          whatWasUnderstood.push({
            title: b.title,
            detail: b.purpose || b.businessNeed || "Approved feature module in proposal.",
            category: "PROPOSAL_FEATURE",
            source: sec.title || "Proposal Scope",
          });
        }
      } else if (b.type === "deliverable" && b.name) {
        if (!whatWasUnderstood.some((u) => u.title.toLowerCase() === b.name.toLowerCase())) {
          whatWasUnderstood.push({
            title: b.name,
            detail: b.description || b.scope || "Formal project deliverable.",
            category: "PROPOSAL_DELIVERABLE",
            source: sec.title || "Deliverables Commitment",
          });
        }
      }
    });
  });

  if (whatWasUnderstood.length === 0) {
    whatWasUnderstood.push({
      title: project.name,
      detail: project.description || "Primary project commitment and delivery objective.",
      category: "PROJECT_CORE",
      source: "Project Charter",
    });
  }

  // Recommended Phases
  const recommendedPhases = [
    {
      phase: "PHASE_1",
      title: "Phase 1: Discovery, Architecture & Setup",
      description: "Technical specifications, environment setup, database schema, and design foundations.",
      order: 1,
      targetWeek: 2,
    },
    {
      phase: "PHASE_2",
      title: "Phase 2: Core Engineering & Functional Implementation",
      description: "Building approved frontend components, backend APIs, data pipelines, and business workflows.",
      order: 2,
      targetWeek: 5,
    },
    {
      phase: "PHASE_3",
      title: "Phase 3: Integration, QA & User Acceptance Testing (UAT)",
      description: "System integration, regression testing, bug remediation, and client staging validation.",
      order: 3,
      targetWeek: 7,
    },
    {
      phase: "PHASE_4",
      title: "Phase 4: Production Cutover, Training & Sign-Off",
      description: "Production release deployment, domain cutover, knowledge transfer, and acceptance sign-off.",
      order: 4,
      targetWeek: 8,
    },
  ];

  // Recommended Deliverables
  const recommendedDeliverables: WorkBreakdownPreview["recommendedDeliverables"] = [
    {
      title: "Architecture & Data Model Specification",
      description: "Relational database schema, API contracts, security definitions, and system topography.",
      category: "ARCHITECTURE",
      milestoneIndex: 0,
      acceptanceCriteria: [
        "Relational schemas validated with indexing and referential integrity.",
        "Security & authorization models implemented with role-based permissions.",
      ],
    },
    ...whatWasUnderstood.slice(0, 5).map((item) => ({
      title: item.title,
      description: item.detail,
      category: "ENGINEERING",
      milestoneIndex: 1,
      sourceRequirementTitle: item.title,
      acceptanceCriteria: [
        `Verified functional execution of ${item.title} matching approved criteria.`,
        `Responsive layout tested across desktop and mobile viewports.`,
        `Zero open high-severity errors or blockers in staging.`,
      ],
    })),
    {
      title: "Quality Assurance & UAT Acceptance Suite",
      description: "End-to-end testing execution logs, security audit, and formal client sign-off report.",
      category: "QA",
      milestoneIndex: 2,
      acceptanceCriteria: [
        "Comprehensive test suite executed with >90% coverage on primary paths.",
        "Client stakeholder review completed with all blocker items resolved.",
      ],
    },
    {
      title: "Production System Release & Handover",
      description: "Live production cutover, operations manual, admin training, and 30-day warranty initiation.",
      category: "DOCUMENTATION",
      milestoneIndex: 3,
      acceptanceCriteria: [
        "Production environment operational on client domain with SSL.",
        "Formal client delivery acceptance sign-off recorded.",
      ],
    },
  ];

  // Generate Tasks strictly derived from the understood scope
  const recommendedTasks: WorkBreakdownPreview["recommendedTasks"] = [];
  let taskCounter = 1;

  // Phase 1 Tasks (Architecture & Discovery)
  recommendedTasks.push(
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Design Relational Database Schema & Data Models",
      description: `Establish Prisma data models, foreign key relationships, indexes, and migrations for ${project.name}.`,
      workstream: "DATABASE",
      teamRole: "Lead Engineer",
      estimatedHours: 14,
      priority: "HIGH",
      milestoneIndex: 0,
      deliverableIndex: 0,
      sourceSection: "Phase 1: Architecture",
      acceptanceCriteria: [
        "Prisma schema cleanly generated without circular cascade errors.",
        "Database migrations verified and test fixtures populated.",
      ],
      subtasks: ["Draft schema models", "Define indexes and foreign keys", "Run migration scripts", "Verify data relationships"],
    },
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Configure Authentication, Roles & Security Middleware",
      description: "Implement session management, role-based route guardrails, and secure API headers.",
      workstream: "INTEGRATION",
      teamRole: "Lead Engineer",
      estimatedHours: 12,
      priority: "HIGH",
      milestoneIndex: 0,
      deliverableIndex: 0,
      sourceSection: "Phase 1: Architecture",
      acceptanceCriteria: [
        "JWT session tokens correctly validated on protected routes.",
        "Unauthorized requests return HTTP 401/403 with standard error format.",
      ],
      subtasks: ["Configure NextAuth / Session token provider", "Create permission middleware", "Add CSRF & Rate-limiting protection"],
      dependsOnTaskIndex: 0,
    },
  );

  // Phase 2 Tasks (Engineering per understood scope item)
  whatWasUnderstood.slice(0, 5).forEach((item, idx) => {
    const delivIdx = idx + 1; // offset by architecture deliverable

    // Design task if UI-oriented
    const isUI = !item.title.toLowerCase().includes("api") && !item.title.toLowerCase().includes("database");
    let designTaskIdx: number | undefined = undefined;

    if (isUI) {
      designTaskIdx = recommendedTasks.length;
      recommendedTasks.push({
        code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
        title: `Design UI / UX Mockups & Interactive States for "${item.title}"`,
        description: `Create high-fidelity interface layouts, component states, and responsive views for ${item.title}.`,
        workstream: "DESIGN",
        teamRole: "UI/UX Designer",
        estimatedHours: 12,
        priority: "HIGH",
        milestoneIndex: 1,
        deliverableIndex: delivIdx,
        sourceRequirementTitle: item.title,
        sourceSection: item.source,
        acceptanceCriteria: [
          "Desktop and mobile responsive layouts designed.",
          "Loading, empty, error, and active states fully detailed.",
        ],
        subtasks: ["Design component wireframes", "Define typography and palette tokens", "Spec empty and error micro-states"],
      });
    }

    // Backend API Task
    const backendTaskIdx = recommendedTasks.length;
    recommendedTasks.push({
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: `Build Backend API & Business Logic for "${item.title}"`,
      description: `Implement REST endpoints, input validation, error handling, and database queries for ${item.title}.`,
      workstream: "BACKEND",
      teamRole: "Backend Engineer",
      estimatedHours: 16,
      priority: "HIGH",
      milestoneIndex: 1,
      deliverableIndex: delivIdx,
      sourceRequirementTitle: item.title,
      sourceSection: item.source,
      acceptanceCriteria: [
        "All CRUD endpoints functional with strict Zod validation.",
        "Error responses follow standard Business OS schema.",
      ],
      subtasks: ["Create API route handlers", "Implement business logic service", "Add Zod input validators", "Write API test assertions"],
      dependsOnTaskIndex: 0, // Depends on DB schema
    });

    // Frontend UI Implementation Task
    recommendedTasks.push({
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: `Develop Frontend Interface & Client State for "${item.title}"`,
      description: `Build interactive React components, connect backend APIs, handle optimistic updates, and polish micro-interactions for ${item.title}.`,
      workstream: "FRONTEND",
      teamRole: "Frontend Engineer",
      estimatedHours: 18,
      priority: "HIGH",
      milestoneIndex: 1,
      deliverableIndex: delivIdx,
      sourceRequirementTitle: item.title,
      sourceSection: item.source,
      acceptanceCriteria: [
        "Interface connects to live API endpoints with clean state handling.",
        "Loading spinners, skeleton loaders, and empty states rendered.",
        "Keyboard navigation and accessibility tested.",
      ],
      subtasks: [
        "Create React UI components",
        "Connect API fetch hooks",
        "Implement search, filters, or pagination",
        "Add loading and error states",
        "Verify responsive layout",
      ],
      dependsOnTaskIndex: backendTaskIdx,
    });
  });

  // Phase 3 Tasks (QA & Client Review)
  const qaTaskIdx = recommendedTasks.length;
  recommendedTasks.push(
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Execute End-to-End System Testing & Defect Remediation",
      description: "Perform comprehensive functional testing across all approved scope modules, logging and fixing issues.",
      workstream: "QA",
      teamRole: "QA Specialist",
      estimatedHours: 20,
      priority: "HIGH",
      milestoneIndex: 2,
      deliverableIndex: recommendedDeliverables.length - 2,
      sourceSection: "Phase 3: QA",
      acceptanceCriteria: [
        "Zero open blocking or high severity defects.",
        "Cross-browser and mobile device testing completed.",
      ],
      subtasks: ["Run smoke tests", "Execute edge-case scenarios", "Verify input validations", "Generate QA summary report"],
      dependsOnTaskIndex: qaTaskIdx - 1,
    },
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Facilitate Client User Acceptance Testing (UAT) & Sign-Off",
      description: "Host client walkthrough session, capture structured feedback, and resolve punch-list items.",
      workstream: "CLIENT_REVIEW",
      teamRole: "Project Manager",
      estimatedHours: 12,
      priority: "HIGH",
      milestoneIndex: 2,
      deliverableIndex: recommendedDeliverables.length - 2,
      sourceSection: "Phase 3: QA",
      acceptanceCriteria: [
        "Client demo completed with stakeholder attendance.",
        "Client acceptance verification recorded.",
      ],
      subtasks: ["Prepare staging demo environment", "Conduct walkthrough with client", "Address client feedback comments"],
      dependsOnTaskIndex: qaTaskIdx,
    },
  );

  // Phase 4 Tasks (Deployment & Handover)
  recommendedTasks.push(
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Execute Production Cutover, DNS Setup & Live Smoke Test",
      description: "Deploy release bundle to production infrastructure, configure custom domains, and run verification.",
      workstream: "DEPLOYMENT",
      teamRole: "DevOps Engineer",
      estimatedHours: 8,
      priority: "HIGH",
      milestoneIndex: 3,
      deliverableIndex: recommendedDeliverables.length - 1,
      sourceSection: "Phase 4: Release",
      acceptanceCriteria: [
        "Production environment live and healthy with HTTPS.",
        "Smoke tests verify primary user journeys on live domain.",
      ],
      subtasks: ["Deploy production container", "Configure custom domain & SSL", "Execute live smoke tests", "Configure monitoring alerts"],
      dependsOnTaskIndex: qaTaskIdx + 1,
    },
    {
      code: `TSK-${String(taskCounter++).padStart(3, "0")}`,
      title: "Deliver Admin Operations Guide & Warranty Handover",
      description: "Provide documentation, administrator training video walkthrough, and activate 30-day warranty support.",
      workstream: "CLIENT_REVIEW",
      teamRole: "Project Manager",
      estimatedHours: 6,
      priority: "MEDIUM",
      milestoneIndex: 3,
      deliverableIndex: recommendedDeliverables.length - 1,
      sourceSection: "Phase 4: Release",
      acceptanceCriteria: [
        "Operations guide PDF shared with client team.",
        "Formal project completion recorded in Business OS.",
      ],
      subtasks: ["Compile documentation package", "Conduct admin training session", "Issue warranty certificate"],
      dependsOnTaskIndex: qaTaskIdx + 2,
    },
  );

  // Calculate distinct workstreams and counts
  const wsMap: Record<WorkstreamType, number> = {
    DISCOVERY: 0,
    DESIGN: 0,
    FRONTEND: 0,
    BACKEND: 0,
    DATABASE: 0,
    INTEGRATION: 0,
    QA: 0,
    DEPLOYMENT: 0,
    CLIENT_REVIEW: 0,
  };

  recommendedTasks.forEach((t) => {
    wsMap[t.workstream] = (wsMap[t.workstream] || 0) + 1;
  });

  const recommendedWorkstreams = ALL_WORKSTREAMS.map((ws) => ({
    id: ws.id,
    label: ws.label,
    color: ws.color,
    taskCount: wsMap[ws.id] || 0,
  })).filter((w) => w.taskCount > 0);

  return {
    projectId: project.id,
    projectName: project.name,
    clientName: project.client.companyName,
    whatWasUnderstood,
    recommendedPhases,
    recommendedDeliverables,
    recommendedWorkstreams,
    recommendedTasks,
  };
}

/* ── Commit Work Breakdown Plan (Atomic Transaction) ─────────── */
export async function commitWorkBreakdownPlan(
  projectId: string,
  plan: WorkBreakdownPreview,
  userId: string,
  userName: string,
) {
  return db.$transaction(async (tx) => {
    const project = await tx.clientProject.findUnique({
      where: { id: projectId },
      include: { client: true, milestones: true, deliverables: true, tasks: true },
    });

    if (!project) throw new Error("Project not found.");

    const now = new Date();
    const startDate = project.startedAt || now;

    // 1. Create or update Milestones
    const createdMilestones = await Promise.all(
      plan.recommendedPhases.map(async (p, idx) => {
        const msTarget = new Date(startDate.getTime() + p.targetWeek * 7 * 24 * 60 * 60 * 1000);
        return tx.projectMilestone.create({
          data: {
            projectId: project.id,
            title: p.title,
            phase: p.phase,
            description: p.description,
            order: idx + 1,
            status: idx === 0 ? "IN_PROGRESS" : "PLANNED",
            progress: 0,
            targetDate: msTarget,
            paymentPercentage: idx === 0 ? 30 : idx === 1 ? 40 : idx === 2 ? 20 : 10,
            paymentAmount: Math.round((project.budget || 100000) * (idx === 0 ? 0.3 : idx === 1 ? 0.4 : idx === 2 ? 0.2 : 0.1)),
            invoiceStatus: "UNINVOICED",
          },
        });
      }),
    );

    // 2. Create Deliverables
    const createdDeliverables = await Promise.all(
      plan.recommendedDeliverables.map(async (d) => {
        const milestone = createdMilestones[d.milestoneIndex] ?? createdMilestones[0];
        return tx.projectDeliverable.create({
          data: {
            projectId: project.id,
            milestoneId: milestone.id,
            title: d.title,
            description: d.description,
            category: d.category,
            proposalFeatureName: d.sourceRequirementTitle || null,
            acceptanceCriteria: JSON.stringify(d.acceptanceCriteria || []),
            status: "DRAFT",
          },
        });
      }),
    );

    // 3. Create Tasks with Subtasks and Acceptance Criteria
    const createdTasks: any[] = [];

    for (let i = 0; i < plan.recommendedTasks.length; i++) {
      const t = plan.recommendedTasks[i];
      const milestone = createdMilestones[t.milestoneIndex] ?? createdMilestones[0];
      const deliverable = t.deliverableIndex !== undefined ? createdDeliverables[t.deliverableIndex] : undefined;

      const taskTargetDate = new Date(
        startDate.getTime() + (milestone.targetDate ? (milestone.targetDate.getTime() - startDate.getTime()) * 0.8 : 14 * 24 * 60 * 60 * 1000),
      );

      const createdTask = await tx.clientTask.create({
        data: {
          code: t.code,
          clientId: project.clientId,
          projectId: project.id,
          milestoneId: milestone.id,
          deliverableId: deliverable?.id || null,
          title: t.title,
          description: t.description,
          expectedResult: `Deliver validated ${t.title} meeting all criteria.`,
          workstream: t.workstream,
          teamRole: t.teamRole,
          estimatedHours: t.estimatedHours,
          priority: t.priority,
          status: "TODO",
          clientVisibility: "INTERNAL",
          dueAt: taskTargetDate,
          order: i + 1,
          sourceType: "PROPOSAL_SCOPE",
          sourceRequirementTitle: t.sourceRequirementTitle || null,
          sourceProposalId: project.proposalId || null,
          sourceDeliverableTitle: deliverable?.title || null,
          sourceSection: t.sourceSection || "Approved Project Scope",
        },
      });

      // Insert Subtasks
      if (t.subtasks && t.subtasks.length > 0) {
        await Promise.all(
          t.subtasks.map((stTitle, sIdx) =>
            tx.subTask.create({
              data: {
                taskId: createdTask.id,
                title: stTitle,
                completed: false,
                order: sIdx + 1,
              },
            }),
          ),
        );
      }

      // Insert Acceptance Criteria
      if (t.acceptanceCriteria && t.acceptanceCriteria.length > 0) {
        await Promise.all(
          t.acceptanceCriteria.map((crit, cIdx) =>
            tx.taskAcceptanceCriterion.create({
              data: {
                taskId: createdTask.id,
                criterion: crit,
                status: "NOT_STARTED",
                order: cIdx + 1,
              },
            }),
          ),
        );
      }

      // Initial task activity
      await tx.taskActivity.create({
        data: {
          taskId: createdTask.id,
          type: "TASK_CREATED",
          title: "Task Generated from Approved Work Plan",
          detail: `Structured under Workstream "${t.workstream}" and Deliverable "${deliverable?.title || milestone.title}".`,
          actorName: userName,
        },
      });

      createdTasks.push(createdTask);
    }

    // 4. Wire up Dependencies
    for (let i = 0; i < plan.recommendedTasks.length; i++) {
      const t = plan.recommendedTasks[i];
      if (t.dependsOnTaskIndex !== undefined && createdTasks[t.dependsOnTaskIndex]) {
        const dependentTask = createdTasks[i];
        const prerequisiteTask = createdTasks[t.dependsOnTaskIndex];

        await tx.taskDependency.create({
          data: {
            taskId: dependentTask.id,
            dependsOnTaskId: prerequisiteTask.id,
            dependencyType: "BLOCKED_BY",
          },
        });
      }
    }

    // 5. Update Project Stage to DEVELOPMENT
    await tx.clientProject.update({
      where: { id: project.id },
      data: {
        stage: "DEVELOPMENT",
        health: "ON_TRACK",
        updatedAt: now,
      },
    });

    // 6. Record Project Activity
    await tx.projectActivity.create({
      data: {
        projectId: project.id,
        type: "WORK_PLAN_APPROVED",
        title: "Work Breakdown Plan Approved & Executed",
        detail: `Generated ${createdMilestones.length} milestones, ${createdDeliverables.length} deliverables, and ${createdTasks.length} executable tasks with complete Work DNA.`,
        actorName: userName,
      },
    });

    // 7. Audit Log
    await recordAudit({
      clientId: project.clientId,
      entity: "PROJECT",
      action: "UPDATED",
      entityId: project.id,
      actorId: userId,
      actorName: userName,
      after: {
        action: "WORK_PLAN_COMMITTED",
        taskCount: createdTasks.length,
        milestoneCount: createdMilestones.length,
      },
    });

    return {
      success: true,
      milestonesCount: createdMilestones.length,
      deliverablesCount: createdDeliverables.length,
      tasksCount: createdTasks.length,
    };
  });
}

/* ── Live Operational Overview & Attention Signals ───────────── */
// CommandCenterMetrics is imported from tasks-types.ts above.

export async function getTaskCommandCenterMetrics(
  workspaceId: string,
  userId?: string,
  projectId?: string,
): Promise<CommandCenterMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const whereProject: any = {
    client: { workspaceId },
  };
  if (projectId) {
    whereProject.id = projectId;
  }

  const tasks = await db.clientTask.findMany({
    where: {
      client: { workspaceId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: true,
      milestone: true,
      deliverable: true,
      subtasks: true,
      dependencies: {
        include: { dependsOnTask: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const deliverables = await db.projectDeliverable.findMany({
    where: {
      project: whereProject,
    },
    include: {
      project: true,
    },
  });

  const changeRequests = await db.projectChangeRequest.findMany({
    where: {
      project: whereProject,
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
    },
    include: {
      project: true,
    },
  });

  // Calculate real operational counters
  let activeWork = 0;
  let inProgress = 0;
  let blocked = 0;
  let overdue = 0;
  let inReview = 0;
  let dueToday = 0;
  let completed = 0;

  tasks.forEach((t) => {
    const isDone = t.status === "COMPLETED" || t.status === "DONE" || t.status === "CLIENT_APPROVED";
    if (isDone) {
      completed++;
    } else {
      activeWork++;
      if (t.status === "IN_PROGRESS") inProgress++;
      if (t.status === "BLOCKED") blocked++;
      if (t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED" || t.status === "READY_FOR_CLIENT" || t.status === "CLIENT_REVIEW") {
        inReview++;
      }
      if (t.dueAt) {
        const dueDate = new Date(t.dueAt);
        if (dueDate < now && !isDone) overdue++;
        if (dueDate >= todayStart && dueDate <= todayEnd) dueToday++;
      }
    }
  });

  // Dynamic "What Needs Attention" List
  const whatNeedsAttention: CommandCenterMetrics["whatNeedsAttention"] = [];

  // 1. Blocked Tasks
  tasks
    .filter((t) => t.status === "BLOCKED")
    .slice(0, 3)
    .forEach((t) => {
      whatNeedsAttention.push({
        id: `att-blocked-${t.id}`,
        type: "BLOCKED",
        title: `Task Blocked: "${t.title}"`,
        reason: t.blockedReason || "Work execution halted pending external prerequisite or unblocking.",
        affectedProject: t.project?.name || "Project",
        affectedMilestone: t.milestone?.title,
        owner: t.assigneeName || "Unassigned",
        nextAction: "Resolve Blocker",
        taskId: t.id,
        projectId: t.projectId || "",
        priority: "CRITICAL",
      });
    });

  // 2. Overdue Tasks
  tasks
    .filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "DONE")
    .slice(0, 3)
    .forEach((t) => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(t.dueAt!).getTime()) / (1000 * 60 * 60 * 24));
      whatNeedsAttention.push({
        id: `att-overdue-${t.id}`,
        type: "OVERDUE",
        title: `Task Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}: "${t.title}"`,
        reason: `Target deadline was ${new Date(t.dueAt!).toLocaleDateString("en-GB")}.`,
        affectedProject: t.project?.name || "Project",
        affectedMilestone: t.milestone?.title,
        owner: t.assigneeName || "Unassigned",
        nextAction: "Review Deadline & Progress",
        taskId: t.id,
        projectId: t.projectId || "",
        priority: "HIGH",
      });
    });

  // 3. Unassigned Critical Tasks
  tasks
    .filter((t) => !t.assigneeName && (t.priority === "HIGH" || t.priority === "URGENT") && t.status !== "COMPLETED" && t.status !== "DONE")
    .slice(0, 3)
    .forEach((t) => {
      whatNeedsAttention.push({
        id: `att-unassigned-${t.id}`,
        type: "UNASSIGNED",
        title: `High Priority Task Unassigned: "${t.title}"`,
        reason: `Critical path item needs team owner allocation to maintain velocity.`,
        affectedProject: t.project?.name || "Project",
        affectedMilestone: t.milestone?.title,
        nextAction: "Assign Team Member",
        taskId: t.id,
        projectId: t.projectId || "",
        priority: "HIGH",
      });
    });

  // 4. Deliverables Ready for Internal Review
  deliverables
    .filter((d) => d.status === "INTERNAL_REVIEW")
    .slice(0, 2)
    .forEach((d) => {
      whatNeedsAttention.push({
        id: `att-deliv-${d.id}`,
        type: "DELIVERABLE_REVIEW",
        title: `Deliverable Ready for Review: "${d.title}"`,
        reason: "All connected tasks completed. Awaiting manager approval before client release.",
        affectedProject: d.project.name,
        nextAction: "Conduct Deliverable Review",
        deliverableId: d.id,
        projectId: d.projectId,
        priority: "HIGH",
      });
    });

  // 5. Change Requests
  changeRequests.slice(0, 2).forEach((cr) => {
    whatNeedsAttention.push({
      id: `att-cr-${cr.id}`,
      type: "CHANGE_REQUEST",
      title: `Client Change Request: "${cr.title}"`,
      reason: cr.description || "Client requested scope modification.",
      affectedProject: cr.project.name,
      nextAction: "Assess Scope & Budget Impact",
      changeRequestId: cr.id,
      projectId: cr.projectId,
      priority: "HIGH",
    });
  });

  // Dynamic "Work Happening Now"
  const workHappeningNow = tasks
    .filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED")
    .slice(0, 6)
    .map((t) => {
      const totalSub = t.subtasks.length;
      const completedSub = t.subtasks.filter((s) => s.completed).length;
      const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : (t.status === "IN_REVIEW" ? 90 : 50);

      let dueLabel = "No deadline";
      if (t.dueAt) {
        const dueDate = new Date(t.dueAt);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) dueLabel = "Due today";
        else if (diffDays === 1) dueLabel = "Due tomorrow";
        else if (diffDays < 0) dueLabel = `Overdue (${Math.abs(diffDays)}d)`;
        else dueLabel = `Due in ${diffDays}d`;
      }

      return {
        id: t.id,
        code: t.code,
        title: t.title,
        workstream: t.workstream || "Frontend",
        status: t.status,
        priority: t.priority,
        progress,
        owner: t.assigneeName || "Unassigned",
        dueLabel,
        projectName: t.project?.name || "Project",
        projectId: t.projectId || "",
      };
    });

  // Dynamic Active Workstreams
  const wsMap: Record<string, { total: number; completed: number; blocked: number }> = {};
  tasks.forEach((t) => {
    const ws = t.workstream || "FRONTEND";
    if (!wsMap[ws]) wsMap[ws] = { total: 0, completed: 0, blocked: 0 };
    wsMap[ws].total++;
    if (t.status === "COMPLETED" || t.status === "DONE" || t.status === "CLIENT_APPROVED") {
      wsMap[ws].completed++;
    }
    if (t.status === "BLOCKED") {
      wsMap[ws].blocked++;
    }
  });

  const activeWorkstreams = ALL_WORKSTREAMS.map((ws) => {
    const stat = wsMap[ws.id] || { total: 0, completed: 0, blocked: 0 };
    const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
    return {
      id: ws.id,
      label: ws.label,
      color: ws.color,
      taskCount: stat.total,
      completedCount: stat.completed,
      blockedCount: stat.blocked,
      progress,
    };
  }).filter((w) => w.taskCount > 0);

  // Employee Workloads
  const employeeMap: Record<
    string,
    { id: string; name: string; role: string; active: number; dueToday: number; overdue: number; blocked: number; inReview: number }
  > = {};

  tasks.forEach((t) => {
    if (t.assigneeName) {
      const name = t.assigneeName;
      if (!employeeMap[name]) {
        employeeMap[name] = {
          id: t.assigneeId || name,
          name,
          role: t.teamRole || "Engineer",
          active: 0,
          dueToday: 0,
          overdue: 0,
          blocked: 0,
          inReview: 0,
        };
      }

      const isDone = t.status === "COMPLETED" || t.status === "DONE" || t.status === "CLIENT_APPROVED";
      if (!isDone) {
        employeeMap[name].active++;
        if (t.status === "BLOCKED") employeeMap[name].blocked++;
        if (t.status === "IN_REVIEW" || t.status === "CHANGES_REQUESTED") employeeMap[name].inReview++;
        if (t.dueAt) {
          const dueDate = new Date(t.dueAt);
          if (dueDate < now) employeeMap[name].overdue++;
          if (dueDate >= todayStart && dueDate <= todayEnd) employeeMap[name].dueToday++;
        }
      }
    }
  });

  const employeeWorkloads = Object.values(employeeMap).map((emp) => {
    const capacity = Math.min(100, Math.round((emp.active / 6) * 100));
    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      activeTasks: emp.active,
      dueToday: emp.dueToday,
      overdue: emp.overdue,
      blocked: emp.blocked,
      inReview: emp.inReview,
      capacity,
    };
  });

  return {
    activeWork,
    inProgress,
    blocked,
    overdue,
    inReview,
    dueToday,
    completed,
    total: tasks.length,
    whatNeedsAttention,
    workHappeningNow,
    activeWorkstreams,
    employeeWorkloads,
  };
}

/* ── Smart Assignee Recommender ───────────────────────────────── */
export async function recommendAssignee(taskId: string, workspaceId: string) {
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!task || !task.project) return null;

  const team = task.project.team || [];
  if (team.length === 0) return null;

  // Workload lookup for project team members
  const memberScores = await Promise.all(
    team.map(async (member) => {
      const activeCount = await db.clientTask.count({
        where: {
          assigneeName: member.name,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "CHANGES_REQUESTED"] },
        },
      });

      const overdueCount = await db.clientTask.count({
        where: {
          assigneeName: member.name,
          dueAt: { lt: new Date() },
          status: { notIn: ["COMPLETED", "DONE", "CLIENT_APPROVED", "CANCELLED"] },
        },
      });

      // Role affinity
      let roleMatch = false;
      const roleLower = (member.role || "").toLowerCase();
      const wsLower = (task.workstream || "").toLowerCase();
      if (wsLower === "frontend" && (roleLower.includes("frontend") || roleLower.includes("full-stack") || roleLower.includes("engineer"))) {
        roleMatch = true;
      } else if (wsLower === "backend" && (roleLower.includes("backend") || roleLower.includes("full-stack") || roleLower.includes("engineer"))) {
        roleMatch = true;
      } else if (wsLower === "design" && (roleLower.includes("design") || roleLower.includes("ui") || roleLower.includes("ux"))) {
        roleMatch = true;
      } else if (wsLower === "qa" && (roleLower.includes("qa") || roleLower.includes("test") || roleLower.includes("quality"))) {
        roleMatch = true;
      } else if (wsLower === "deployment" && (roleLower.includes("devops") || roleLower.includes("architect") || roleLower.includes("lead"))) {
        roleMatch = true;
      }

      // Compute score: higher is better
      let score = 50;
      if (roleMatch) score += 40;
      score -= activeCount * 5;
      score -= overdueCount * 15;

      return {
        member,
        score,
        activeCount,
        overdueCount,
        roleMatch,
      };
    }),
  );

  memberScores.sort((a, b) => b.score - a.score);
  const best = memberScores[0];

  return {
    recommended: best.member,
    score: best.score,
    reason: `${best.roleMatch ? `Relevant role (${best.member.role}) · ` : ""}${best.activeCount} active tasks${best.overdueCount === 0 ? " · Zero overdue tasks" : ""}`,
    allCandidates: memberScores.map((m) => ({
      name: m.member.name,
      role: m.member.role,
      activeTasks: m.activeCount,
      overdueTasks: m.overdueCount,
      score: m.score,
    })),
  };
}

/* ── Duplicate Task Detector ─────────────────────────────────── */
export async function detectDuplicateTasks(
  workspaceId: string,
  title: string,
  projectId?: string,
): Promise<Array<{ id: string; code: string | null; title: string; status: string; projectName: string }>> {
  if (!title || title.trim().length < 3) return [];

  const cleanTitle = title.trim().toLowerCase();
  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 2);

  const existingTasks = await db.clientTask.findMany({
    where: {
      client: { workspaceId },
      ...(projectId ? { projectId } : {}),
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      project: true,
    },
    take: 50,
  });

  const matches: Array<{ id: string; code: string | null; title: string; status: string; projectName: string }> = [];

  for (const t of existingTasks) {
    const existingTitle = t.title.toLowerCase();
    if (existingTitle === cleanTitle) {
      matches.push({
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        projectName: t.project?.name || "Project",
      });
    } else {
      const matchWords = words.filter((w) => existingTitle.includes(w));
      if (words.length > 0 && matchWords.length / words.length >= 0.7) {
        matches.push({
          id: t.id,
          code: t.code,
          title: t.title,
          status: t.status,
          projectName: t.project?.name || "Project",
        });
      }
    }
  }

  return matches.slice(0, 3);
}

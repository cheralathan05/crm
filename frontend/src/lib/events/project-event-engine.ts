import { db } from "@/lib/db";
import { recordAudit } from "@/lib/clients";
import { askOllamaJson, isOllamaAvailable, OLLAMA_MODEL } from "@/lib/ai/ollama/ollama.client";
import { launchProjectFromApprovedProposal, extractApprovedScopeAndPlan, nextProjectCode } from "@/lib/projects";
import { resolveTaskLayer, resolveTaskRequirement } from "@/lib/tasks-types";

export type ProjectEventType =
  | "PROPOSAL_APPROVED"
  | "PROJECT_CREATED"
  | "PROJECT_ANALYZED"
  | "WORKPLAN_GENERATED"
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_STARTED"
  | "TASK_BLOCKED"
  | "TASK_SUBMITTED"
  | "TASK_COMPLETED"
  | "DELIVERABLE_READY"
  | "DELIVERABLE_SUBMITTED"
  | "DELIVERABLE_APPROVED"
  | "CLIENT_CHANGE_REQUESTED"
  | "CLIENT_RESPONSE_RECEIVED"
  | "SCOPE_CHANGED"
  | "MILESTONE_COMPLETED"
  | "PROJECT_COMPLETED";

export type ProjectEventInput = {
  eventType: ProjectEventType;
  projectId?: string;
  proposalId?: string;
  taskId?: string;
  deliverableId?: string;
  changeRequestId?: string;
  actorId?: string;
  actorName?: string;
  payload?: any;
  eventId?: string;
};

export type ProjectEventResult = {
  ok: boolean;
  message: string;
  projectId?: string;
  changeRequestId?: string;
  unlockedTaskCount?: number;
  projectProgress?: number;
  currentPhase?: string;
  nextBestAction?: string;
  details?: any;
};

/**
 * Central Autonomous Project Event Engine
 * Implements strict event-driven state transitions, dependency propagation,
 * progress recalculation, and audit logging with 100% real database records.
 */
export async function processProjectEvent(input: ProjectEventInput): Promise<ProjectEventResult> {
  const now = new Date();
  const actor = input.actorName || "Autonomous Project Engine";

  // ────────────────────────────────────────────────────────────────
  // 01. EVENT: PROPOSAL_APPROVED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "PROPOSAL_APPROVED" && input.proposalId) {
    const proposal = await db.clientProposal.findUnique({
      where: { id: input.proposalId },
      include: { client: true, projects: true },
    });

    if (!proposal) {
      return { ok: false, message: "Proposal not found." };
    }

    // Idempotency check: if project already exists for this proposal, return existing
    if (proposal.projects && proposal.projects.length > 0) {
      const existingProject = proposal.projects[0];
      return {
        ok: true,
        message: "Project already active for this approved proposal.",
        projectId: existingProject.id,
      };
    }

    // Extract approved scope and plan from real proposal document
    const plan = extractApprovedScopeAndPlan(proposal);
    const code = await nextProjectCode(proposal.client.workspaceId);

    // Launch project from approved proposal
    const project = await launchProjectFromApprovedProposal({
      workspaceId: proposal.client.workspaceId,
      clientId: proposal.clientId,
      proposalId: proposal.id,
      userId: input.actorId || proposal.client.workspaceId,
      userName: actor,
      code,
      name: proposal.title,
      description: proposal.title,
      budget: proposal.amount || 0,
      currency: proposal.currency || "INR",
      scopeItems: plan.scopeItems || [],
      milestones: plan.milestones,
      deliverables: plan.deliverables,
      tasks: plan.tasks,
      modules: plan.modules,
    });

    // Record Event Activity
    await db.projectActivity.create({
      data: {
        projectId: project.id,
        type: "PROPOSAL_APPROVED",
        title: "Proposal Approved by Client",
        detail: `Client approved ${proposal.reference || "Proposal"} (v${proposal.version}). Project automatically provisioned with ${plan.tasks.length} tasks.`,
        actorName: actor,
      },
    });

    // Automatically trigger downstream analysis and work structuring
    await processProjectEvent({
      eventType: "PROJECT_CREATED",
      projectId: project.id,
      actorName: actor,
    });

    return {
      ok: true,
      message: `Project ${project.code} successfully launched from approved proposal.`,
      projectId: project.id,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 02. EVENT: PROJECT_CREATED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "PROJECT_CREATED" && input.projectId) {
    const project = await db.clientProject.findUnique({
      where: { id: input.projectId },
      include: {
        client: true,
        proposal: true,
        milestones: true,
        deliverables: true,
        tasks: { include: { dependencies: true } },
      },
    });

    if (!project) return { ok: false, message: "Project not found." };

    // Auto-match real workspace employees to tasks based on role compatibility
    const workspaceEmployees = await db.employee.findMany({
      where: { workspaceId: project.client.workspaceId, status: "ACTIVE" },
    });

    if (workspaceEmployees.length > 0) {
      await db.$transaction(async (tx) => {
        for (const t of project.tasks) {
          if (!t.assigneeId && !t.assigneeName) {
            // Find matching employee
            const layer = resolveTaskLayer(t);
            let matchedEmp = workspaceEmployees.find((e) => {
              const dept = (e.department || "").toUpperCase();
              const roleTitle = (e.primaryResponsibility || "").toUpperCase();
              if (layer === "DATABASE" && (roleTitle.includes("BACKEND") || roleTitle.includes("LEAD") || roleTitle.includes("DATA") || roleTitle.includes("ENGINEER"))) return true;
              if (layer === "BACKEND" && (roleTitle.includes("BACKEND") || roleTitle.includes("API") || roleTitle.includes("FULL") || roleTitle.includes("ENGINEER"))) return true;
              if (layer === "FRONTEND" && (roleTitle.includes("FRONTEND") || roleTitle.includes("UI") || roleTitle.includes("DESIGN") || roleTitle.includes("WEB"))) return true;
              if (layer === "TESTING" && (roleTitle.includes("QA") || roleTitle.includes("TEST") || roleTitle.includes("QUALITY"))) return true;
              if (layer === "DEVOPS" && (roleTitle.includes("DEVOPS") || roleTitle.includes("CLOUD") || roleTitle.includes("ARCHITECT"))) return true;
              return false;
            }) || workspaceEmployees[0];

            if (matchedEmp) {
              await tx.clientTask.update({
                where: { id: t.id },
                data: {
                  assigneeId: matchedEmp.userId || matchedEmp.id,
                  assigneeName: matchedEmp.fullName,
                  teamRole: matchedEmp.primaryResponsibility || "Engineer",
                },
              });
            }
          }
        }
      });
    }

    // Set initial task readiness based on dependencies
    await updateTaskReadinessStates(project.id);
    const metrics = await recalculateProjectMetrics(project.id);

    return {
      ok: true,
      message: "Project analysis and task provisioning complete.",
      projectId: project.id,
      projectProgress: metrics.progress,
      currentPhase: metrics.currentPhase,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // 03. EVENT: TASK_STARTED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "TASK_STARTED" && input.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: input.taskId },
      include: { project: true },
    });

    if (!task) return { ok: false, message: "Task not found." };

    await db.clientTask.update({
      where: { id: task.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: task.startedAt || now,
      },
    });

    if (task.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "TASK_STARTED",
          title: `Task Started: ${task.code || "Task"}`,
          detail: `${task.title} entered active implementation under ${task.assigneeName || "assigned engineer"}.`,
          actorName: actor,
        },
      });
      await recalculateProjectMetrics(task.projectId);
    }

    return { ok: true, message: `Task ${task.code} started.` };
  }

  // ────────────────────────────────────────────────────────────────
  // 04. EVENT: TASK_SUBMITTED (IN_REVIEW)
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "TASK_SUBMITTED" && input.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: input.taskId },
      include: { project: true },
    });

    if (!task) return { ok: false, message: "Task not found." };

    await db.clientTask.update({
      where: { id: task.id },
      data: { status: "IN_REVIEW" },
    });

    if (task.projectId) {
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "TASK_SUBMITTED",
          title: `Work Submitted for Review: ${task.code || "Task"}`,
          detail: `${task.title} submitted for code & architecture verification.`,
          actorName: actor,
        },
      });
    }

    return { ok: true, message: `Task ${task.code} submitted for review.` };
  }

  // ────────────────────────────────────────────────────────────────
  // 05. EVENT: TASK_COMPLETED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "TASK_COMPLETED" && input.taskId) {
    const task = await db.clientTask.findUnique({
      where: { id: input.taskId },
      include: {
        project: true,
        deliverable: { include: { tasks: true } },
      },
    });

    if (!task) return { ok: false, message: "Task not found." };

    // 1. Mark task complete
    await db.clientTask.update({
      where: { id: task.id },
      data: {
        status: "DONE",
        completedAt: now,
      },
    });

    // 2. Unlock all downstream dependent tasks (BLOCKED -> READY)
    let unlockedCount = 0;
    if (task.projectId) {
      unlockedCount = await updateTaskReadinessStates(task.projectId);

      // 3. Log Activity
      await db.projectActivity.create({
        data: {
          projectId: task.projectId,
          type: "TASK_COMPLETED",
          title: `Task Verified & Done: ${task.code || "Task"}`,
          detail: `${task.title} verified. ${unlockedCount > 0 ? `Unlocked ${unlockedCount} downstream dependent tasks.` : ""}`,
          actorName: actor,
        },
      });

      // 4. Check if Deliverable boundary is reached
      if (task.deliverable) {
        const remainingTasksInDeliv = await db.clientTask.count({
          where: {
            deliverableId: task.deliverable.id,
            status: { notIn: ["DONE", "COMPLETED", "CLIENT_APPROVED"] },
          },
        });

        if (remainingTasksInDeliv === 0 && task.deliverable.status === "DRAFT") {
          await db.projectDeliverable.update({
            where: { id: task.deliverable.id },
            data: { status: "INTERNAL_REVIEW" },
          });

          await db.projectActivity.create({
            data: {
              projectId: task.projectId,
              type: "DELIVERABLE_READY",
              title: `Deliverable Ready for Review: ${task.deliverable.title}`,
              detail: `All required engineering implementation tasks for ${task.deliverable.title} are complete.`,
              actorName: "Autonomous Project Engine",
            },
          });
        }
      }

      // 5. Recalculate Project Progress & Phase
      const metrics = await recalculateProjectMetrics(task.projectId);

      return {
        ok: true,
        message: `Task ${task.code || task.title} completed.`,
        unlockedTaskCount: unlockedCount,
        projectProgress: metrics.progress,
        currentPhase: metrics.currentPhase,
        nextBestAction: metrics.nextBestActionText,
      };
    }

    return { ok: true, message: `Task ${task.code || task.title} completed.` };
  }

  // ────────────────────────────────────────────────────────────────
  // 06. EVENT: DELIVERABLE_SUBMITTED (TO CLIENT)
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "DELIVERABLE_SUBMITTED" && input.deliverableId) {
    const deliverable = await db.projectDeliverable.findUnique({
      where: { id: input.deliverableId },
      include: { project: { include: { client: true } } },
    });

    if (!deliverable) return { ok: false, message: "Deliverable not found." };

    await db.projectDeliverable.update({
      where: { id: deliverable.id },
      data: {
        status: "CLIENT_REVIEW",
        submittedAt: now,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: deliverable.projectId,
        type: "DELIVERABLE_SUBMITTED",
        title: `Deliverable Sent to Client: ${deliverable.title}`,
        detail: `Client review requested for ${deliverable.title}.`,
        actorName: actor,
      },
    });

    await recalculateProjectMetrics(deliverable.projectId);

    return { ok: true, message: `Deliverable "${deliverable.title}" submitted to client for review.` };
  }

  // ────────────────────────────────────────────────────────────────
  // 07. EVENT: DELIVERABLE_APPROVED (ACCEPTED)
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "DELIVERABLE_APPROVED" && input.deliverableId) {
    const deliverable = await db.projectDeliverable.findUnique({
      where: { id: input.deliverableId },
      include: { project: true },
    });

    if (!deliverable) return { ok: false, message: "Deliverable not found." };

    await db.projectDeliverable.update({
      where: { id: deliverable.id },
      data: {
        status: "ACCEPTED",
        clientApprovedAt: now,
        clientApprovedBy: input.payload?.clientName || actor,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: deliverable.projectId,
        type: "DELIVERABLE_APPROVED",
        title: `Deliverable Accepted by Client: ${deliverable.title}`,
        detail: `Client formally approved ${deliverable.title}. Milestone progress advanced.`,
        actorName: input.payload?.clientName || actor,
      },
    });

    // Check if entire project is ready for completion
    const unacceptedCount = await db.projectDeliverable.count({
      where: {
        projectId: deliverable.projectId,
        status: { not: "ACCEPTED" },
      },
    });

    const pendingTaskCount = await db.clientTask.count({
      where: {
        projectId: deliverable.projectId,
        status: { notIn: ["DONE", "COMPLETED", "CLIENT_APPROVED"] },
      },
    });

    if (unacceptedCount === 0 && pendingTaskCount === 0) {
      await processProjectEvent({
        eventType: "PROJECT_COMPLETED",
        projectId: deliverable.projectId,
        actorName: "Autonomous Project Engine",
      });
    } else {
      await recalculateProjectMetrics(deliverable.projectId);
    }

    return { ok: true, message: `Deliverable "${deliverable.title}" accepted.` };
  }

  // ────────────────────────────────────────────────────────────────
  // 08. EVENT: CLIENT_CHANGE_REQUESTED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "CLIENT_CHANGE_REQUESTED" && input.projectId) {
    const { title, description, reason, deliverableId, timelineDaysImpact = 3, budgetImpact = 0 } = input.payload || {};

    const cr = await db.projectChangeRequest.create({
      data: {
        projectId: input.projectId,
        deliverableId: deliverableId || null,
        title: title || "Client Scope Adjustment",
        description: description || "Client requested modifications during review.",
        reason: reason || "Client Feedback",
        impactTimelineDays: timelineDaysImpact,
        impactBudgetAmount: budgetImpact,
        status: "SUBMITTED",
        submittedByName: actor,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: input.projectId,
        type: "CLIENT_CHANGE_REQUESTED",
        title: `Change Request Submitted: ${cr.title}`,
        detail: `${description || "Modification requested."} Estimated impact: +${timelineDaysImpact} days.`,
        actorName: actor,
      },
    });

    await recalculateProjectMetrics(input.projectId);

    return { ok: true, message: "Change request logged and queued for administrative review.", changeRequestId: cr.id };
  }

  // ────────────────────────────────────────────────────────────────
  // 09. EVENT: PROJECT_COMPLETED
  // ────────────────────────────────────────────────────────────────
  if (input.eventType === "PROJECT_COMPLETED" && input.projectId) {
    const project = await db.clientProject.findUnique({
      where: { id: input.projectId },
      include: { client: true, deliverables: true, tasks: true },
    });

    if (!project) return { ok: false, message: "Project not found." };

    await db.clientProject.update({
      where: { id: project.id },
      data: {
        stage: "COMPLETED",
        health: "ON_TRACK",
        completedAt: now,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: project.id,
        type: "PROJECT_COMPLETED",
        title: "Project Delivery Completed",
        detail: `All ${project.deliverables.length} deliverables accepted and ${project.tasks.length} tasks completed. Commercial delivery finalized.`,
        actorName: actor,
      },
    });

    return {
      ok: true,
      message: `Project ${project.name} successfully marked as COMPLETED.`,
      projectId: project.id,
    };
  }

  return { ok: false, message: `Unsupported event type: ${input.eventType}` };
}

/**
 * Propagates dependency readiness across all project tasks.
 * If task A depends on task B and task B is DONE, task A unlocks (BLOCKED -> READY).
 */
async function updateTaskReadinessStates(projectId: string): Promise<number> {
  let unlockedCount = 0;

  const tasks = await db.clientTask.findMany({
    where: { projectId },
    include: {
      dependencies: {
        include: { dependsOnTask: true },
      },
    },
  });

  const updates: Array<{ id: string; status: any; executionState: string }> = [];

  for (const t of tasks) {
    if (t.status === "DONE" || t.status === "COMPLETED" || t.status === "IN_PROGRESS" || t.status === "IN_REVIEW") {
      continue;
    }

    const hasIncompleteDependencies = t.dependencies.some(
      (d) => d.dependsOnTask.status !== "DONE" && d.dependsOnTask.status !== "COMPLETED",
    );

    if (hasIncompleteDependencies && (t.status !== "BLOCKED" || t.executionState !== "NOT_READY")) {
      updates.push({ id: t.id, status: "BLOCKED", executionState: "NOT_READY" });
    } else if (!hasIncompleteDependencies && (t.status === "BLOCKED" || t.executionState === "NOT_READY")) {
      updates.push({ id: t.id, status: "TODO", executionState: "READY" });
      unlockedCount++;
    }
  }

  if (updates.length > 0) {
    await db.$transaction(
      updates.map((u) =>
        db.clientTask.update({
          where: { id: u.id },
          data: { status: u.status, executionState: u.executionState },
        }),
      ),
    );
  }

  return unlockedCount;
}

/**
 * Dynamically computes real project progress, active phase, health, and next best action.
 */
export async function recalculateProjectMetrics(projectId: string) {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      tasks: true,
      deliverables: true,
      milestones: { orderBy: { order: "asc" } },
      changeRequests: true,
    },
  });

  if (!project) return { progress: 0, currentPhase: "PLANNING", nextBestActionText: "" };

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const totalDeliverables = project.deliverables.length;
  const acceptedDeliverables = project.deliverables.filter((d) => d.status === "ACCEPTED").length;

  // Weighted honest progress: 40% task execution + 60% client deliverable acceptance
  const taskPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const delivPct = totalDeliverables > 0 ? (acceptedDeliverables / totalDeliverables) * 100 : 0;
  const progress = Math.min(100, Math.round(totalDeliverables > 0 ? taskPct * 0.4 + delivPct * 0.6 : taskPct));

  // Determine current active phase automatically
  let currentPhase = "DISCOVERY & SETUP";
  if (progress >= 95) currentPhase = "FINAL HANDOVER";
  else if (progress >= 70) currentPhase = "TESTING & CLIENT UAT";
  else if (progress >= 30) currentPhase = "CORE ENGINEERING";
  else if (progress >= 10) currentPhase = "ARCHITECTURE & FOUNDATION";

  // Health assessment
  const blockedTasks = project.tasks.filter((t) => t.status === "BLOCKED");
  let health: "ON_TRACK" | "AT_RISK" | "BLOCKED" = "ON_TRACK";
  if (blockedTasks.length > 2 || project.changeRequests.some((cr) => cr.status === "SUBMITTED")) {
    health = "AT_RISK";
  }

  // Next Best Action Text
  let nextBestActionText = "Execute next sprint tasks";
  if (blockedTasks.length > 0) {
    nextBestActionText = `Resolve blocker on ${blockedTasks[0].title}`;
  } else if (project.deliverables.some((d) => d.status === "INTERNAL_REVIEW")) {
    nextBestActionText = "Complete internal review for ready deliverable";
  } else if (project.deliverables.some((d) => d.status === "CLIENT_REVIEW")) {
    nextBestActionText = "Awaiting client formal acceptance review";
  }

  // Update project in database
  await db.clientProject.update({
    where: { id: projectId },
    data: { health },
  });

  return {
    progress,
    currentPhase,
    health,
    nextBestActionText,
    completedTasks,
    totalTasks,
    acceptedDeliverables,
    totalDeliverables,
  };
}

/**
 * Synthesizes a real-time human-readable Project Story grounded strictly in database state.
 */
export async function generateProjectStory(projectId: string): Promise<string> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      proposal: { include: { approvals: { take: 1, orderBy: { approvedAt: "desc" } } } },
      milestones: { orderBy: { order: "asc" } },
      deliverables: true,
      tasks: true,
      team: true,
      changeRequests: true,
    },
  });

  if (!project) return "Project records not found in database.";

  const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const blockedTasks = project.tasks.filter((t) => t.status === "BLOCKED");
  const acceptedDelivs = project.deliverables.filter((d) => d.status === "ACCEPTED").length;
  const approvalDate = project.proposal?.approvals[0]?.approvedAt
    ? new Date(project.proposal.approvals[0].approvedAt).toLocaleDateString()
    : "recently";

  let story = `**${project.client.companyName}** approved the **${project.name}** commercial proposal on ${approvalDate}.\n\n`;
  story += `The project is currently in the **${project.stage}** stage with overall execution at **${Math.round((completedTasks / (project.tasks.length || 1)) * 100)}% complete** (${completedTasks}/${project.tasks.length} engineering tasks finished, ${acceptedDelivs}/${project.deliverables.length} deliverables accepted).\n\n`;

  if (blockedTasks.length > 0) {
    story += `⚠️ **Attention Required**: ${blockedTasks.length} task(s) are currently waiting on upstream completion (${blockedTasks.map((t) => t.title).slice(0, 2).join(", ")}).\n\n`;
  } else {
    story += `✓ **Sprint Flow**: All active engineering workstreams are unblocked and progressing according to schedule.\n\n`;
  }

  const activeMilestone = project.milestones.find((m) => m.status === "IN_PROGRESS") || project.milestones[0];
  if (activeMilestone) {
    story += `The current delivery milestone is **${activeMilestone.title}**. Next focus: complete remaining deliverable criteria for client sign-off.`;
  }

  return story;
}

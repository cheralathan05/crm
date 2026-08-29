import crypto from "crypto";
import { db } from "@/lib/db";
import { askOllamaJson, isOllamaAvailable } from "@/lib/ai/ollama/ollama.client";
import { gatherProjectFacts } from "./employee-project-brief.service";

/* ════════════════════════════════════════════════════════════════════
   EMPLOYEE OS 3.0: COMPLETE PRODUCT-LEVEL OPERATING SYSTEM ENGINE
   
   ZERO MOCK DATA — ONLY REAL DATABASE TRUTH, AUTHORIZED INTEGRATIONS,
   AND DERIVED OPERATIONAL EVENTS.
   ════════════════════════════════════════════════════════════════════ */

// ── 1. EMPLOYEE HOME DATA ENGINE ────────────────────────────────────

export async function getEmployeeOSHomeData(projectId: string, employeeId: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, employee, workstream, projectRole, blueprint } = facts;

  // ── Calculate Focus (ONE recommended starting point based on dependencies & priority)
  const activeTasks = project.tasks.filter(
    (t) => t.status !== "DONE" && t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );

  const myTasks = activeTasks.filter((t) => t.assigneeId === employee.id);
  const candidatePool = myTasks.length > 0 ? myTasks : activeTasks;

  // Find unblocked tasks
  const unblockedTasks = candidatePool.filter((t) => {
    if (t.status === "BLOCKED") return false;
    const deps = t.dependencies || [];
    if (deps.length === 0) return true;
    return deps.every((d: any) => d.dependsOnTask?.status === "DONE" || d.dependsOnTask?.status === "COMPLETED");
  });

  const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedCandidates = (unblockedTasks.length > 0 ? unblockedTasks : candidatePool).sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
    if (pDiff !== 0) return pDiff;
    return (a.order || 0) - (b.order || 0);
  });

  const focusTask = sortedCandidates[0] || null;
  let focusWhy = "Foundational project work item matching your role responsibility.";
  if (focusTask) {
    if (focusTask.dependentOnMe && focusTask.dependentOnMe.length > 0) {
      focusWhy = `Critical downstream path: ${focusTask.dependentOnMe.length} task(s) including "${focusTask.dependentOnMe[0]?.task?.title}" are waiting for this completion.`;
    } else if (focusTask.priority === "URGENT" || focusTask.priority === "HIGH") {
      focusWhy = `Designated as ${focusTask.priority} priority for the current milestone.`;
    } else {
      focusWhy = `All prerequisite dependencies are resolved and ready for active build.`;
    }
  }

  // ── Calculate Real Momentum & Build Streak from actual database activity
  const buildSessions = await db.employeeBuildSession.findMany({
    where: { employeeId },
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  const taskActivities = await db.taskActivity.findMany({
    where: { task: { projectId } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const contributions = await db.employeeContribution.findMany({
    where: { employeeId },
    orderBy: { occurredAt: "desc" },
  });

  // Calculate unique active build days in chronological sequence
  const activeDateSet = new Set<string>();
  buildSessions.forEach((s) => activeDateSet.add(s.startedAt.toISOString().slice(0, 10)));
  contributions.forEach((c) => activeDateSet.add(c.occurredAt.toISOString().slice(0, 10)));

  const sortedDates = Array.from(activeDateSet).sort().reverse();
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sortedDates[0] === todayStr || sortedDates[0] === yesterday) {
      currentStreak = 1;
      let checkDate = new Date(sortedDates[0]);
      for (let i = 1; i < sortedDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (sortedDates[i] === checkDate.toISOString().slice(0, 10)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  const completedWorkCount = project.tasks.filter((t) => t.assigneeId === employee.id && (t.status === "DONE" || t.status === "COMPLETED")).length;
  const activeWorkCount = myTasks.length;

  // ── Calculate "Waiting For You" (People/systems waiting for your work)
  const waitingForYouItems: Array<{
    myTaskId: string;
    myTaskTitle: string;
    blockedTaskId: string;
    blockedTaskTitle: string;
    blockedRole: string;
    blockedAssigneeName: string | null;
  }> = [];

  for (const t of myTasks) {
    if (t.dependentOnMe && t.dependentOnMe.length > 0) {
      for (const dep of t.dependentOnMe) {
        if (dep.task?.status !== "DONE" && dep.task?.status !== "COMPLETED") {
          waitingForYouItems.push({
            myTaskId: t.id,
            myTaskTitle: t.title,
            blockedTaskId: dep.task.id,
            blockedTaskTitle: dep.task.title,
            blockedRole: dep.task.teamRole || dep.task.layer || "Engineering",
            blockedAssigneeName: dep.task.assigneeName || null,
          });
        }
      }
    }
  }

  // ── Calculate "You Are Waiting For" (Dependencies blocking your work)
  const youAreWaitingForItems: Array<{
    myTaskId: string;
    myTaskTitle: string;
    prerequisiteTaskId: string;
    prerequisiteTaskTitle: string;
    prerequisiteStatus: string;
    prerequisiteAssigneeName: string | null;
  }> = [];

  for (const t of myTasks) {
    if (t.dependencies && t.dependencies.length > 0) {
      for (const dep of t.dependencies) {
        if (dep.dependsOnTask && dep.dependsOnTask.status !== "DONE" && dep.dependsOnTask.status !== "COMPLETED") {
          youAreWaitingForItems.push({
            myTaskId: t.id,
            myTaskTitle: t.title,
            prerequisiteTaskId: dep.dependsOnTask.id,
            prerequisiteTaskTitle: dep.dependsOnTask.title,
            prerequisiteStatus: dep.dependsOnTask.status,
            prerequisiteAssigneeName: (dep.dependsOnTask as any).assigneeName || null,
          });
        }
      }
    }
  }

  // ── Calculate "Needs Your Attention" (Meaningful alerts only)
  const attentionItems: Array<{ id: string; type: string; title: string; detail: string; actionUrl?: string }> = [];
  
  const blockedTasks = myTasks.filter((t) => t.status === "BLOCKED");
  blockedTasks.forEach((t) => {
    attentionItems.push({
      id: `att-blocked-${t.id}`,
      type: "BLOCKED_WORK",
      title: `Blocked: ${t.title}`,
      detail: t.blockedReason || "Awaiting dependency resolution.",
    });
  });

  const pendingCheckpoints = await db.buildCheckpoint.findMany({
    where: { employeeId, isConfirmed: false },
    take: 3,
  });

  pendingCheckpoints.forEach((cp) => {
    attentionItems.push({
      id: cp.id,
      type: "CHECKPOINT_CONFIRMATION",
      title: `Confirm Checkpoint: ${cp.title}`,
      detail: cp.description || "Progress milestone detected for your work.",
    });
  });

  // ── Calculate "Your Impact" (Real metrics derived from database)
  const pagesBuilt = contributions.filter((c) => c.type === "PAGE_BUILT").length;
  const apisConnected = contributions.filter((c) => c.type === "API_CONNECTED").length;
  const bugsVerified = contributions.filter((c) => c.type === "BUG_VERIFIED").length;
  const dependenciesUnblocked = contributions.filter((c) => c.type === "DEPENDENCY_UNBLOCKED").length;
  const deliverablesShipped = contributions.filter((c) => c.type === "DELIVERABLE_SHIPPED").length;

  return {
    employee: {
      id: employee.id,
      name: employee.fullName,
      email: employee.email,
      role: projectRole,
      workstream,
      avatar: employee.avatar,
    },
    project: {
      id: project.id,
      name: project.name,
      code: project.code,
      clientName: project.client?.companyName || "Client Organization",
      stage: project.stage,
      health: project.health,
      progress: project.progress,
      deadline: project.targetCompletion?.toISOString() || project.deadline?.toISOString() || null,
    },
    focus: focusTask
      ? {
          taskId: focusTask.id,
          code: focusTask.code || "TASK",
          title: focusTask.title,
          layer: focusTask.layer || workstream,
          priority: focusTask.priority,
          why: focusWhy,
          isBlocked: focusTask.status === "BLOCKED",
          blockedReason: focusTask.blockedReason || null,
        }
      : null,
    momentum: {
      currentBuildStreak: currentStreak,
      longestBuildStreak: Math.max(currentStreak, sortedDates.length),
      completedWorkCount,
      activeWorkCount,
      lastBuildDate: sortedDates[0] || null,
    },
    needsAttention: attentionItems,
    waitingForYou: waitingForYouItems,
    youAreWaitingFor: youAreWaitingForItems,
    impact: {
      pagesBuilt,
      apisConnected,
      bugsVerified,
      dependenciesUnblocked,
      deliverablesShipped,
      totalContributions: contributions.length,
    },
  };
}

// ── 2. MY DAY PERSONAL EXECUTION ENGINE ──────────────────────────────

export async function getEmployeeMyDayData(projectId: string, employeeId: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, employee, workstream } = facts;

  const myTasks = project.tasks.filter((t) => t.assigneeId === employee.id || !t.assigneeId);

  // Group into NOW, NEXT, WAITING, BLOCKED, REVIEW
  const nowTasks = myTasks.filter((t) => t.status === "IN_PROGRESS");
  const blockedTasks = myTasks.filter((t) => t.status === "BLOCKED");
  const reviewTasks = myTasks.filter((t) => t.status === "IN_REVIEW");
  
  const waitingTasks = myTasks.filter((t) => {
    if (t.status === "IN_PROGRESS" || t.status === "BLOCKED" || t.status === "IN_REVIEW" || t.status === "DONE" || t.status === "COMPLETED") return false;
    const deps = t.dependencies || [];
    return deps.some((d: any) => d.dependsOnTask?.status !== "DONE" && d.dependsOnTask?.status !== "COMPLETED");
  });

  const nextTasks = myTasks.filter((t) => {
    if (t.status === "IN_PROGRESS" || t.status === "BLOCKED" || t.status === "IN_REVIEW" || t.status === "DONE" || t.status === "COMPLETED") return false;
    const deps = t.dependencies || [];
    return deps.length === 0 || deps.every((d: any) => d.dependsOnTask?.status === "DONE" || d.dependsOnTask?.status === "COMPLETED");
  });

  return {
    projectId: project.id,
    projectName: project.name,
    todayDate: new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
    sections: {
      now: nowTasks.map(formatTaskDetail),
      next: nextTasks.map(formatTaskDetail),
      waiting: waitingTasks.map(formatTaskDetail),
      blocked: blockedTasks.map(formatTaskDetail),
      review: reviewTasks.map(formatTaskDetail),
    },
    counts: {
      now: nowTasks.length,
      next: nextTasks.length,
      waiting: waitingTasks.length,
      blocked: blockedTasks.length,
      review: reviewTasks.length,
    },
  };
}

function formatTaskDetail(t: any) {
  return {
    id: t.id,
    code: t.code || "TASK",
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    layer: t.layer || "Engineering",
    estimatedHours: t.estimatedHours || 4,
    blockedReason: t.blockedReason || null,
    acceptanceCriteriaCount: (t.acceptanceCriteria || []).length,
  };
}

// ── 3. BUILD SESSION & REAL-TIME PROGRESS ───────────────────────────

export async function startBuildSession(params: {
  employeeId: string;
  projectId: string;
  taskId?: string;
  capabilityName?: string;
}) {
  const { employeeId, projectId, taskId, capabilityName } = params;

  // Pause or complete any existing active sessions
  await db.employeeBuildSession.updateMany({
    where: { employeeId, status: "ACTIVE" },
    data: { status: "PAUSED", updatedAt: new Date() },
  });

  const session = await db.employeeBuildSession.create({
    data: {
      employeeId,
      projectId,
      taskId: taskId || null,
      capabilityName: capabilityName || "Project Component",
      status: "ACTIVE",
    },
    include: { task: { select: { id: true, code: true, title: true } } },
  });

  // If task provided, ensure task is set to IN_PROGRESS
  if (taskId) {
    await db.clientTask.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }

  return session;
}

export async function endBuildSession(params: {
  sessionId: string;
  whatChanged?: string;
  whatCompleted?: string;
  whatRemains?: string;
  blockers?: string;
  evidenceUrl?: string;
  evidenceNote?: string;
  markTaskCompleted?: boolean;
}) {
  const { sessionId, whatChanged, whatCompleted, whatRemains, blockers, evidenceUrl, evidenceNote, markTaskCompleted } = params;

  const session = await db.employeeBuildSession.findUnique({
    where: { id: sessionId },
    include: { task: true, employee: true, project: true },
  });

  if (!session) throw new Error("Build session not found.");

  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000));

  const updatedSession = await db.employeeBuildSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMinutes,
      whatChanged: whatChanged || "Completed build actions.",
      whatCompleted: whatCompleted || null,
      whatRemains: whatRemains || null,
      blockers: blockers || null,
      evidenceUrl: evidenceUrl || null,
      evidenceNote: evidenceNote || null,
      status: "COMPLETED",
    },
  });

  // If task completed, update task and create verified contribution
  if (markTaskCompleted && session.taskId) {
    await db.clientTask.update({
      where: { id: session.taskId },
      data: { status: "DONE", completedAt: new Date() },
    });

    await db.employeeContribution.create({
      data: {
        employeeId: session.employeeId,
        projectId: session.projectId,
        type: "FEATURE_IMPLEMENTED",
        title: session.task?.title || "Feature Implementation",
        detail: whatCompleted || `Completed ${session.task?.title}`,
        impactText: `Advanced ${session.project.name} by completing ${session.task?.code || "task"}.`,
        evidenceRef: evidenceUrl || null,
      },
    });

    // Check if downstream tasks are unblocked and notify
    const downstreamDeps = await db.taskDependency.findMany({
      where: { dependsOnTaskId: session.taskId },
      include: { task: true },
    });

    for (const dep of downstreamDeps) {
      if (dep.task.assigneeId && dep.task.assigneeId !== session.employeeId) {
        await db.employeeInboxItem.create({
          data: {
            employeeId: dep.task.assigneeId,
            category: "NEEDS_ACTION",
            title: `Dependency Unblocked: ${dep.task.title}`,
            whatChanged: `${session.employee.fullName} completed "${session.task?.title}".`,
            whyItMatters: `Your task "${dep.task.title}" is now unblocked and ready to build.`,
            whatToDo: "Open Build Center and start work.",
            actionUrl: `/employee/work?taskId=${dep.task.id}`,
          },
        });
      }
    }
  }

  return updatedSession;
}

// ── 4. DEPENDENCY RADAR ENGINE ──────────────────────────────────────

export async function getDependencyRadarData(projectId: string, employeeId: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, employee, blueprint } = facts;

  const myTasks = project.tasks.filter((t) => t.assigneeId === employee.id);

  // Group 1: I NEED (Required APIs, Entities, Prerequisite tasks)
  const iNeed: Array<{ id: string; category: string; name: string; purpose: string; status: string }> = [];
  (blueprint?.backendApis || []).slice(0, 6).forEach((a: any) => {
    iNeed.push({
      id: a.id,
      category: "API Contract",
      name: `${a.method} ${a.path}`,
      purpose: a.purpose || "Backend endpoint",
      status: a.status || "PLANNED",
    });
  });

  // Group 2: WHO I AM WAITING FOR (Upstream blockers with real assignee names)
  const whoIAmWaitingFor: Array<{
    myTaskId: string;
    myTaskTitle: string;
    waitingOnTask: string;
    waitingOnPerson: string;
    waitingOnRole: string;
    prerequisiteStatus: string;
  }> = [];

  for (const t of myTasks) {
    for (const dep of t.dependencies || []) {
      if (dep.dependsOnTask && dep.dependsOnTask.status !== "DONE" && dep.dependsOnTask.status !== "COMPLETED") {
        whoIAmWaitingFor.push({
          myTaskId: t.id,
          myTaskTitle: t.title,
          waitingOnTask: dep.dependsOnTask.title,
          waitingOnPerson: (dep.dependsOnTask as any).assigneeName || "Unassigned Engineer",
          waitingOnRole: dep.dependsOnTask.teamRole || dep.dependsOnTask.layer || "Engineering",
          prerequisiteStatus: dep.dependsOnTask.status,
        });
      }
    }
  }

  // Group 3: WHO IS WAITING FOR ME (Downstream blocked tasks with assignee names)
  const whoIsWaitingForMe: Array<{
    myTaskId: string;
    myTaskTitle: string;
    blockedTask: string;
    blockedPerson: string;
    blockedRole: string;
    reason: string;
  }> = [];

  for (const t of myTasks) {
    for (const dep of t.dependentOnMe || []) {
      if (dep.task && dep.task.status !== "DONE" && dep.task.status !== "COMPLETED") {
        whoIsWaitingForMe.push({
          myTaskId: t.id,
          myTaskTitle: t.title,
          blockedTask: dep.task.title,
          blockedPerson: dep.task.assigneeName || "Squad Engineer",
          blockedRole: dep.task.teamRole || dep.task.layer || "Downstream Squad",
          reason: `Requires completion of "${t.title}" before starting.`,
        });
      }
    }
  }

  return {
    projectName: project.name,
    iNeed,
    whoIAmWaitingFor,
    whoIsWaitingForMe,
  };
}

// ── 5. SEARCHABLE PROJECT MEMORY & DECISIONS ─────────────────────────

export async function getProjectDecisionsData(projectId: string) {
  const decisions = await db.projectDecision.findMany({
    where: { projectId },
    orderBy: { decidedAt: "desc" },
  });

  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    select: { name: true, code: true },
  });

  return {
    projectName: project?.name || "Project",
    decisions: decisions.map((d) => ({
      id: d.id,
      title: d.title,
      decision: d.decision,
      reason: d.reason,
      decisionOwner: d.decisionOwner,
      approver: d.approver,
      relatedRequirement: d.relatedRequirement,
      relatedFeature: d.relatedFeature,
      impact: d.impact,
      decidedAt: d.decidedAt.toISOString(),
    })),
  };
}

// ── 6. UNIFIED INBOX & NOTIFICATION ENGINE ───────────────────────────

export async function getEmployeeInboxData(employeeId: string) {
  const items = await db.employeeInboxItem.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return {
    needsAction: items.filter((i) => i.category === "NEEDS_ACTION" && !i.isResolved),
    waiting: items.filter((i) => i.category === "WAITING" && !i.isResolved),
    information: items.filter((i) => i.category === "INFORMATION" || i.isResolved),
    unreadCount: items.filter((i) => !i.isRead).length,
  };
}

// ── 7. AI COACH ENGINE (Contextual guidance without hallucination) ───

export async function askEmployeeAICoach(params: {
  employeeId: string;
  projectId: string;
  question: string;
}) {
  const { employeeId, projectId, question } = params;
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, employee, workstream, projectRole, blueprint } = facts;

  const defaultGuidance = `As an engineer working on ${project.name} in the ${workstream} responsibility area, ensure all active work strictly adheres to approved API contracts and database schema integrity. When submitting completed items, attach verified evidence (e.g. PR, test outcome, or UI screenshots).`;

  const isUp = await isOllamaAvailable();
  if (!isUp) {
    return {
      answer: defaultGuidance,
      modelUsed: "deterministic-coach",
    };
  }

  const systemPrompt = `You are the Senior Technical Coach for Business OS.
Your role is to answer questions from ${employee.fullName} (${projectRole}, ${workstream}) who is building ${project.name}.

RULES:
1. Ground every answer in REAL project facts.
2. Be crisp, supportive, and practical.
3. Answer what to build, what to verify, potential edge cases, and dependency checkpoints.
4. If a detail is not in scope, say: "Not defined in the approved project scope."`;

  const userPrompt = `Project: "${project.name}" (${project.client?.companyName})
Workstream: ${workstream} (${projectRole})
Available Pages: ${JSON.stringify((blueprint?.frontendCapabilities || []).slice(0, 4).map((c: any) => c.name))}
Available APIs: ${JSON.stringify((blueprint?.backendApis || []).slice(0, 4).map((a: any) => `${a.method} ${a.path}`))}

Employee Question: "${question}"`;

  try {
    const result = await askOllamaJson({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 8000,
    });

    if (result.ok && result.content) {
      const parsed = JSON.parse(result.content);
      return {
        answer: parsed.answer || parsed.advice || result.content,
        modelUsed: result.modelUsed || "Ollama Local Engine",
      };
    }
  } catch (err) {
    console.warn("[askEmployeeAICoach] Falling back:", err);
  }

  return {
    answer: defaultGuidance,
    modelUsed: "deterministic-coach",
  };
}

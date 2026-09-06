import { db } from "@/lib/db";

export type SubmitProofInput = {
  taskId: string;
  employeeId: string;
  summary: string;
  proofType?: string;
  proofUrl?: string;
  knownIssues?: string;
  comments?: string;
};

export type ReviewDecisionInput = {
  submissionId: string;
  reviewerId?: string;
  reviewerName: string;
  decision: "APPROVED" | "CHANGES_REQUESTED" | "BLOCKED";
  reason?: string; // Mandatory for CHANGES_REQUESTED and BLOCKED
  comment?: string;
};

/**
 * Business OS Task Execution -> Review -> Completion Engine
 * Enforces the core rule:
 * A task is strictly an internal execution unit with zero client delivery actions.
 */

/**
 * 1. Start or Resume Work on a Task
 */
export async function startTask({
  taskId,
  employeeId,
  actorName,
}: {
  taskId: string;
  employeeId?: string;
  actorName?: string;
}) {
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  const updatedTask = await db.clientTask.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      startedAt: task.startedAt || new Date(),
      blockedReason: null,
      assigneeId: employeeId || task.assigneeId,
      assigneeName: actorName || task.assigneeName,
    },
  });

  // Record Task Activity
  await db.taskActivity.create({
    data: {
      taskId,
      type: "STATUS_CHANGED",
      title: "Task Started",
      detail: `${actorName || "Assigned engineer"} started work on ${task.title}.`,
      actorName: actorName || task.assigneeName,
    },
  });

  if (task.projectId) {
    await db.projectActivity.create({
      data: {
        projectId: task.projectId,
        type: "TASK_STARTED",
        title: `Task Started: ${task.title}`,
        detail: `${actorName || task.assigneeName || "Engineer"} initiated development.`,
        actorName: actorName || task.assigneeName,
      },
    });
  }

  return updatedTask;
}

/**
 * 2. Submit Task Work with Proof for Internal Review
 * Creates a real TaskSubmission record. Does NOT complete the task.
 */
export async function submitTaskForReview({
  taskId,
  employeeId,
  summary,
  proofType = "SCREENSHOT",
  proofUrl,
  knownIssues,
  comments,
}: SubmitProofInput) {
  if (!summary || !summary.trim()) {
    throw new Error("Completion summary is required.");
  }

  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true, code: true } },
    },
  });

  if (!task) {
    throw new Error("Task not found.");
  }

  if (!task.projectId) {
    throw new Error("Task is not associated with an active project.");
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { role: true },
  });

  if (!employee) {
    throw new Error("Employee profile not found.");
  }

  // Count existing submissions for iteration tracking
  const existingSubmissionsCount = await db.taskSubmission.count({
    where: { taskId },
  });
  const iteration = existingSubmissionsCount + 1;
  const submissionCode = `SUB-${task.code || "TSK"}-${iteration}`;

  // 1. Create real TaskSubmission record
  const submission = await db.taskSubmission.create({
    data: {
      submissionCode,
      taskId,
      projectId: task.projectId,
      employeeId,
      summary: summary.trim(),
      proofType,
      proofUrl: proofUrl?.trim() || null,
      knownIssues: knownIssues?.trim() || null,
      comments: comments?.trim() || null,
      iteration,
      status: "SUBMITTED",
    },
  });

  // 2. If proofUrl is provided, link to EvidenceRecord for auditability
  if (proofUrl?.trim()) {
    await db.evidenceRecord.create({
      data: {
        taskId,
        type: proofType === "PR" ? "PULL_REQUEST" : proofType === "DEPLOYMENT" ? "DEPLOYMENT_URL" : "SCREENSHOT",
        title: `Proof (Iteration #${iteration}): ${task.title}`,
        url: proofUrl.trim(),
        description: summary.trim(),
        verifiedBy: employee.fullName,
        verifiedAt: new Date(),
      },
    });
  }

  // 3. Update task status to IN_REVIEW
  const updatedTask = await db.clientTask.update({
    where: { id: taskId },
    data: {
      status: "IN_REVIEW",
      blockedReason: null,
    },
  });

  // 4. Record Activities
  await db.taskActivity.create({
    data: {
      taskId,
      type: "SUBMITTED_FOR_REVIEW",
      title: `Submitted for Review (Iteration #${iteration})`,
      detail: summary.trim(),
      actorName: employee.fullName,
    },
  });

  await db.projectActivity.create({
    data: {
      projectId: task.projectId,
      type: "SUBMISSION_CREATED",
      title: `Work Submitted: ${task.title}`,
      detail: `${employee.fullName} submitted proof (${submissionCode}) for review.`,
      actorName: employee.fullName,
    },
  });

  // 5. Audit Event
  await db.employeeAuditEvent.create({
    data: {
      workspaceId: employee.workspaceId,
      employeeId: employee.id,
      action: "TASK_SUBMITTED_FOR_REVIEW",
      actorId: employee.id,
      actorName: employee.fullName,
      detail: `Submitted iteration #${iteration} for ${task.code}: ${task.title}`,
      afterState: JSON.stringify({ submissionId: submission.id, code: submissionCode }),
    },
  });

  return { submission, task: updatedTask };
}

/**
 * 3. Review a Task Submission: APPROVE or REQUEST CHANGES
 * A task is completed ONLY upon approval.
 */
export async function reviewTaskSubmission({
  submissionId,
  reviewerId,
  reviewerName,
  decision,
  reason,
  comment,
}: ReviewDecisionInput) {
  const submission = await db.taskSubmission.findUnique({
    where: { id: submissionId },
    include: {
      task: true,
      project: true,
      employee: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found.");
  }

  if (decision === "CHANGES_REQUESTED") {
    if (!reason || !reason.trim()) {
      throw new Error("A specific reason is required when requesting changes.");
    }

    const trimmedReason = reason.trim();

    // 1. Create real TaskReview record
    const review = await db.taskReview.create({
      data: {
        taskId: submission.taskId,
        submissionId: submission.id,
        reviewerId: reviewerId || null,
        reviewerName,
        status: "CHANGES_REQUESTED",
        feedback: trimmedReason,
        decidedAt: new Date(),
      },
    });

    // 2. Update Submission status
    await db.taskSubmission.update({
      where: { id: submissionId },
      data: { status: "CHANGES_REQUESTED" },
    });

    // 3. Update ClientTask status
    const updatedTask = await db.clientTask.update({
      where: { id: submission.taskId },
      data: {
        status: "CHANGES_REQUESTED",
        blockedReason: trimmedReason,
      },
    });

    // 4. Log Activities
    await db.taskActivity.create({
      data: {
        taskId: submission.taskId,
        type: "CHANGES_REQUESTED",
        title: `Changes Requested by ${reviewerName}`,
        detail: trimmedReason,
        actorName: reviewerName,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: submission.projectId,
        type: "REVIEW_CHANGES_REQUESTED",
        title: `Changes Requested: ${submission.task.title}`,
        detail: `${reviewerName} requested updates: "${trimmedReason}"`,
        actorName: reviewerName,
      },
    });

    // 5. Notify the Employee immediately
    await db.employeeInboxItem.create({
      data: {
        employeeId: submission.employeeId,
        category: "NEEDS_ACTION",
        title: `⚠️ Changes Requested: ${submission.task.title}`,
        whatChanged: trimmedReason,
        whyItMatters: "The work item needs adjustments before acceptance.",
        whatToDo: "Review the feedback, adjust the implementation, and submit updated proof.",
        actionUrl: `/employee/work?tab=MY_WORK&highlightTaskId=${submission.taskId}`,
      },
    });

    return { ok: true, decision: "CHANGES_REQUESTED", review, task: updatedTask };
  }

  if (decision === "APPROVED") {
    const trimmedComment = (comment || "Approved: Acceptance criteria verified.").trim();

    // 1. Create real TaskReview record
    const review = await db.taskReview.create({
      data: {
        taskId: submission.taskId,
        submissionId: submission.id,
        reviewerId: reviewerId || null,
        reviewerName,
        status: "APPROVED",
        feedback: trimmedComment,
        decidedAt: new Date(),
      },
    });

    // 2. Update Submission status
    await db.taskSubmission.update({
      where: { id: submissionId },
      data: { status: "APPROVED" },
    });

    // 3. Complete Task
    const updatedTask = await db.clientTask.update({
      where: { id: submission.taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        blockedReason: null,
      },
    });

    // 4. Log Activities
    await db.taskActivity.create({
      data: {
        taskId: submission.taskId,
        type: "COMPLETED",
        title: `Task Approved & Completed`,
        detail: `Approved by ${reviewerName}. Feedback: ${trimmedComment}`,
        actorName: reviewerName,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: submission.projectId,
        type: "TASK_COMPLETED",
        title: `Task Completed: ${submission.task.title}`,
        detail: `Verified and approved by ${reviewerName}.`,
        actorName: reviewerName,
      },
    });

    // 5. Notify Submitting Employee
    await db.employeeInboxItem.create({
      data: {
        employeeId: submission.employeeId,
        category: "INFORMATION",
        title: `✅ Task Approved: ${submission.task.title}`,
        whatChanged: `Verified and signed off by ${reviewerName}.`,
        whyItMatters: "Your work passed acceptance review. Downstream dependencies have been unlocked.",
        whatToDo: "Proceed to your next eligible task in My Work.",
        actionUrl: `/employee/work?tab=MY_WORK`,
      },
    });

    // 6. Automatically trigger dependency cascade resolution
    const cascadeResult = await cascadeDependencyResolution(submission.taskId, submission.projectId);

    // 7. Update Project Progress from honest database state
    await updateProjectProgress(submission.projectId);

    return {
      ok: true,
      decision: "APPROVED",
      review,
      task: updatedTask,
      unlockedTasks: cascadeResult.unlockedTasks,
    };
  }

  if (decision === "BLOCKED") {
    if (!reason || !reason.trim()) {
      throw new Error("A specific reason is required when blocking a task during review.");
    }

    const trimmedReason = reason.trim();

    // 1. Create real TaskReview record
    const review = await db.taskReview.create({
      data: {
        taskId: submission.taskId,
        submissionId: submission.id,
        reviewerId: reviewerId || null,
        reviewerName,
        status: "CHANGES_REQUESTED",
        feedback: `BLOCKED: ${trimmedReason}`,
        decidedAt: new Date(),
      },
    });

    // 2. Update Submission status
    await db.taskSubmission.update({
      where: { id: submissionId },
      data: { status: "CHANGES_REQUESTED" },
    });

    // 3. Mark task as BLOCKED
    const updatedTask = await db.clientTask.update({
      where: { id: submission.taskId },
      data: {
        status: "BLOCKED",
        blockedReason: trimmedReason,
      },
    });

    // 4. Log Activities
    await db.taskActivity.create({
      data: {
        taskId: submission.taskId,
        type: "BLOCKED",
        title: `Task Blocked by Reviewer ${reviewerName}`,
        detail: trimmedReason,
        actorName: reviewerName,
      },
    });

    await db.projectActivity.create({
      data: {
        projectId: submission.projectId,
        type: "TASK_BLOCKED",
        title: `Task Blocked: ${submission.task.title}`,
        detail: `${reviewerName} blocked task during review: "${trimmedReason}"`,
        actorName: reviewerName,
      },
    });

    // 5. Notify the employee
    await db.employeeInboxItem.create({
      data: {
        employeeId: submission.employeeId,
        category: "NEEDS_ACTION",
        title: `🚫 Task Blocked by Reviewer: ${submission.task.title}`,
        whatChanged: trimmedReason,
        whyItMatters: "Reviewer identified a blocking impediment that halts task progress.",
        whatToDo: "Review blocker details with the team and unblock the task.",
        actionUrl: `/employee/work?tab=MY_WORK&highlightTaskId=${submission.taskId}`,
      },
    });

    return {
      ok: true,
      decision: "BLOCKED",
      review,
      task: updatedTask,
    };
  }

  throw new Error(`Unsupported review decision: ${decision}`);
}

/**
 * 4. Dynamic Dependency Engine
 * When a task is completed, unlocks dependent tasks whose upstream dependencies are now ALL completed.
 */
export async function cascadeDependencyResolution(completedTaskId: string, projectId: string) {
  // Find all tasks that depend on this completed task
  const dependentLinks = await db.taskDependency.findMany({
    where: { dependsOnTaskId: completedTaskId },
    include: {
      task: {
        include: {
          dependencies: {
            include: {
              dependsOnTask: { select: { id: true, code: true, title: true, status: true } },
            },
          },
        },
      },
    },
  });

  const unlockedTasks: Array<{ id: string; code: string | null; title: string; assigneeId: string | null }> = [];

  for (const link of dependentLinks) {
    const depTask = link.task;
    if (!depTask || depTask.status === "COMPLETED" || depTask.status === "DONE") continue;

    // Check if ALL upstream dependencies are completed
    const allUpstreamDone = depTask.dependencies.every(
      (d) => d.dependsOnTask.status === "COMPLETED" || d.dependsOnTask.status === "DONE"
    );

    if (allUpstreamDone) {
      // Unlock task to READY
      const newStatus = depTask.status === "TODO" || depTask.status === "BLOCKED" ? "READY" : depTask.status;
      await db.clientTask.update({
        where: { id: depTask.id },
        data: {
          status: newStatus,
          executionState: "READY",
          blockedReason: null,
        },
      });

      unlockedTasks.push({
        id: depTask.id,
        code: depTask.code,
        title: depTask.title,
        assigneeId: depTask.assigneeId,
      });

      // Notify the assigned employee
      if (depTask.assigneeId) {
        await db.employeeInboxItem.create({
          data: {
            employeeId: depTask.assigneeId,
            category: "NEEDS_ACTION",
            title: `🚀 Dependency Ready: ${depTask.title}`,
            whatChanged: "All upstream dependencies have been completed and verified.",
            whyItMatters: "Your task is now ready to begin execution.",
            whatToDo: "Open task in My Work and click [ START TASK ].",
            actionUrl: `/employee/work?tab=MY_WORK&highlightTaskId=${depTask.id}`,
          },
        });
      }

      // Log task activity
      await db.taskActivity.create({
        data: {
          taskId: depTask.id,
          type: "DEPENDENCY_RESOLVED",
          title: "All Dependencies Resolved",
          detail: `Upstream work verified. Task is now READY.`,
          actorName: "System Dependency Engine",
        },
      });
    }
  }

  return { unlockedTasks };
}

/**
 * 5. Report a Blocker on a Task
 */
export async function reportTaskBlocker({
  taskId,
  employeeId,
  actorName,
  blockerReason,
}: {
  taskId: string;
  employeeId?: string;
  actorName?: string;
  blockerReason: string;
}) {
  if (!blockerReason || !blockerReason.trim()) {
    throw new Error("Blocker reason is required.");
  }

  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) throw new Error("Task not found.");

  const updatedTask = await db.clientTask.update({
    where: { id: taskId },
    data: {
      status: "BLOCKED",
      blockedReason: blockerReason.trim(),
    },
  });

  await db.taskActivity.create({
    data: {
      taskId,
      type: "BLOCKED",
      title: "Blocker Reported",
      detail: blockerReason.trim(),
      actorName: actorName || "Assigned Engineer",
    },
  });

  if (task.projectId) {
    await db.projectActivity.create({
      data: {
        projectId: task.projectId,
        type: "TASK_BLOCKED",
        title: `Task Blocked: ${task.title}`,
        detail: blockerReason.trim(),
        actorName: actorName || "Assigned Engineer",
      },
    });
  }

  return updatedTask;
}

/**
 * 6. Resolve / Unblock a Task
 */
export async function resolveTaskBlocker({
  taskId,
  actorName,
}: {
  taskId: string;
  actorName?: string;
}) {
  const task = await db.clientTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found.");

  const updatedTask = await db.clientTask.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      blockedReason: null,
    },
  });

  await db.taskActivity.create({
    data: {
      taskId,
      type: "UNBLOCKED",
      title: "Task Unblocked",
      detail: `${actorName || "Engineer"} resolved blocker and resumed development.`,
      actorName: actorName || "Assigned Engineer",
    },
  });

  return updatedTask;
}

/**
 * 7. Get Next Eligible Work (Real data only, never fabricate)
 */
export async function getNextEligibleTask({
  employeeId,
  projectId,
  currentTaskId,
}: {
  employeeId: string;
  projectId: string;
  currentTaskId?: string;
}) {
  const candidateTasks = await db.clientTask.findMany({
    where: {
      projectId,
      id: currentTaskId ? { not: currentTaskId } : undefined,
      assigneeId: employeeId,
      status: { in: ["TODO", "READY", "IN_PROGRESS"] },
    },
    include: {
      dependencies: {
        include: {
          dependsOnTask: { select: { id: true, code: true, title: true, status: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }],
  });

  // Filter tasks whose upstream dependencies are satisfied
  for (const t of candidateTasks) {
    const isReady = t.dependencies.every(
      (d) => d.dependsOnTask.status === "COMPLETED" || d.dependsOnTask.status === "DONE"
    );
    if (isReady) {
      return {
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
        layer: t.layer,
        priority: t.priority,
      };
    }
  }

  return null;
}

/**
 * Helper: Update Project Progress honestly from task states
 */
async function updateProjectProgress(projectId: string) {
  const tasks = await db.clientTask.findMany({
    where: { projectId },
    select: { status: true },
  });

  if (tasks.length === 0) return;

  const completed = tasks.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;
  const progress = Math.round((completed / tasks.length) * 100);

  await db.clientProject.update({
    where: { id: projectId },
    data: { progress },
  });
}

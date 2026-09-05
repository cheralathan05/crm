import { db } from "@/lib/db";

/**
 * Handles automatic work activation & handoff when a work item dependency is approved (Sections 20 & 21).
 */
export async function activateDependentWork(approvedTaskId: string): Promise<{
  unlockedTaskIds: string[];
  notificationsSent: number;
}> {
  const approvedTask = await db.clientTask.findUnique({
    where: { id: approvedTaskId },
    include: {
      dependentOnMe: {
        include: {
          task: {
            include: {
              dependencies: {
                include: { dependsOnTask: true },
              },
            },
          },
        },
      },
    },
  });

  if (!approvedTask) {
    return { unlockedTaskIds: [], notificationsSent: 0 };
  }

  const unlockedTaskIds: string[] = [];
  let notificationsSent = 0;

  for (const depRecord of approvedTask.dependentOnMe) {
    const dependentTask = depRecord.task;
    if (!dependentTask) continue;

    // Check if ALL dependencies of this task are now completed or approved
    const allPrereqsMet = dependentTask.dependencies.every((d) => {
      const depStatus = d.dependsOnTask.status;
      const depExec = d.dependsOnTask.executionState;
      return depStatus === "COMPLETED" || depStatus === "DONE" || depStatus === "CLIENT_APPROVED" || depExec === "APPROVED";
    });

    if (allPrereqsMet) {
      await db.clientTask.update({
        where: { id: dependentTask.id },
        data: {
          status: dependentTask.status === "BLOCKED" || dependentTask.status === "TODO" ? "READY" : dependentTask.status,
          executionState: "READY",
          blockedReason: null,
        },
      });

      unlockedTaskIds.push(dependentTask.id);

      // Create high-signal inbox alert for the assigned employee
      if (dependentTask.assigneeId) {
        await db.employeeInboxItem.create({
          data: {
            employeeId: dependentTask.assigneeId,
            category: "NEEDS_ACTION",
            title: `Your dependency is ready: "${approvedTask.title}"`,
            whatChanged: `Prerequisite ${approvedTask.code || "work"} was approved.`,
            whyItMatters: `You are now fully unblocked to begin work on "${dependentTask.title}".`,
            whatToDo: "Open your active work item and start implementation.",
            actionUrl: `/employee?tab=MY_WORK&projectId=${dependentTask.projectId}`,
          },
        });
        notificationsSent++;
      }
    }
  }

  return { unlockedTaskIds, notificationsSent };
}

/**
 * Blocker Engine (Section 22): Raises a structured blocker linked to Project, Product Area, Work Item, and Dependency.
 */
export async function raiseProjectBlocker(params: {
  projectId: string;
  productAreaId?: string;
  taskId: string;
  dependencyId?: string;
  reason: string;
  raisedById: string;
  raisedByName: string;
}): Promise<any> {
  // Find task & dependency owner
  const task = await db.clientTask.findUnique({
    where: { id: params.taskId },
    include: {
      dependencies: {
        include: { dependsOnTask: true },
      },
    },
  });

  if (!task) throw new Error("Task not found.");

  const firstDep = task.dependencies[0]?.dependsOnTask;
  const ownerRole = firstDep?.teamRole || firstDep?.layer ? `${firstDep.layer} Engineer` : "Backend Developer";
  const ownerName = firstDep?.assigneeName || "Backend Team";
  const ownerId = firstDep?.assigneeId || null;

  const blocker = await db.projectBlocker.create({
    data: {
      projectId: params.projectId,
      productAreaId: params.productAreaId || task.productAreaId || null,
      taskId: params.taskId,
      dependencyId: params.dependencyId || firstDep?.id || null,
      reason: params.reason,
      ownerRole,
      ownerName,
      ownerId,
      status: "ACTIVE",
      expectedAction: `Resolve dependency "${firstDep?.title || "API capability"}" to unblock ${task.title}.`,
      raisedById: params.raisedById,
      raisedByName: params.raisedByName,
    },
  });

  // Update task status to BLOCKED
  await db.clientTask.update({
    where: { id: params.taskId },
    data: {
      status: "BLOCKED",
      executionState: "BLOCKED",
      blockedReason: params.reason,
    },
  });

  // Notify owner
  if (ownerId) {
    await db.employeeInboxItem.create({
      data: {
        employeeId: ownerId,
        category: "NEEDS_ACTION",
        title: `BLOCKER RAISED: "${task.title}" is waiting for your work`,
        whatChanged: `${params.raisedByName} reported a blocker: "${params.reason}"`,
        whyItMatters: "Downstream frontend delivery is currently halted.",
        whatToDo: `Complete and verify "${firstDep?.title || "your deliverable"}" to unblock the team.`,
        actionUrl: `/employee?tab=MY_WORK&projectId=${params.projectId}`,
      },
    });
  }

  return blocker;
}

/**
 * Resolves an active blocker and restores the work item to READY (Section 22).
 */
export async function resolveProjectBlocker(blockerId: string): Promise<any> {
  const blocker = await db.projectBlocker.update({
    where: { id: blockerId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });

  if (blocker.taskId) {
    await db.clientTask.update({
      where: { id: blocker.taskId },
      data: {
        status: "READY",
        executionState: "READY",
        blockedReason: null,
      },
    });
  }

  return blocker;
}

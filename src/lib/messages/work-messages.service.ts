import { db } from "@/lib/db";

export type WorkstreamType = "FRONTEND" | "BACKEND" | "DATABASE" | "QA" | "OPERATIONS";

/**
 * Get all conversations and work ecosystem data for the current user/employee.
 * Enforces: NO MOCK DATA. Real entities only.
 */
export async function getWorkMessagesHubData({
  workspaceId,
  actorEmployeeId,
  actorUserId,
  isAdmin = false,
}: {
  workspaceId?: string | null;
  actorEmployeeId?: string | null;
  actorUserId?: string | null;
  isAdmin?: boolean;
}) {
  // 1. Fetch Real Workspace Employees
  const allWorkspaceEmployees = await db.employee.findMany({
    where: {
      status: { not: "OFFBOARDED" },
    },
    include: { role: true, team: true },
    orderBy: { fullName: "asc" },
  });

  // 2. Fetch Real Projects with Real Assigned Employees and Tasks
  const projects = await db.clientProject.findMany({
    include: {
      client: true,
      tasks: {
        select: {
          id: true,
          code: true,
          title: true,
          layer: true,
          workstream: true,
          status: true,
          assigneeId: true,
          assigneeName: true,
          blockedReason: true,
          dueAt: true,
        },
      },
      staffAllocations: {
        include: {
          employee: {
            include: { role: true, team: true },
          },
        },
      },
      productBuilds: {
        include: {
          employee: { include: { role: true } },
          proofs: true,
          reviews: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group staff per project by real engineering discipline / layer
  const structuredProjects = projects.map((p) => {
    const assignedEmployeesMap = new Map<string, any>();

    // 1. From Staff Allocations
    p.staffAllocations.forEach((alloc) => {
      if (alloc.employee) {
        assignedEmployeesMap.set(alloc.employee.id, {
          id: alloc.employee.id,
          name: alloc.employee.fullName,
          code: alloc.employee.employeeCode,
          role: alloc.employee.role?.name || "Specialist",
          department: alloc.employee.department,
          projectRole: alloc.projectRole || alloc.employee.department,
          status: alloc.employee.status,
        });
      }
    });

    // 2. From Product Builds
    p.productBuilds.forEach((pb) => {
      if (pb.employee && !assignedEmployeesMap.has(pb.employee.id)) {
        assignedEmployeesMap.set(pb.employee.id, {
          id: pb.employee.id,
          name: pb.employee.fullName,
          code: pb.employee.employeeCode,
          role: pb.employee.role?.name || "Specialist",
          department: pb.employee.department,
          projectRole: pb.workstream,
          status: pb.employee.status,
        });
      }
    });

    // 3. From Task Assignees
    p.tasks.forEach((t) => {
      if (t.assigneeId && !assignedEmployeesMap.has(t.assigneeId)) {
        const emp = allWorkspaceEmployees.find((e) => e.id === t.assigneeId);
        if (emp) {
          assignedEmployeesMap.set(emp.id, {
            id: emp.id,
            name: emp.fullName,
            code: emp.employeeCode,
            role: emp.role?.name || "Specialist",
            department: emp.department,
            projectRole: t.layer || t.workstream || emp.department,
            status: emp.status,
          });
        }
      }
    });

    // 4. If project has no assigned staff yet, attach active workspace employees matching disciplines
    if (assignedEmployeesMap.size === 0) {
      allWorkspaceEmployees.forEach((emp) => {
        assignedEmployeesMap.set(emp.id, {
          id: emp.id,
          name: emp.fullName,
          code: emp.employeeCode,
          role: emp.role?.name || "Specialist",
          department: emp.department,
          projectRole: emp.department,
          status: emp.status,
        });
      });
    }

    const allAssigned = Array.from(assignedEmployeesMap.values());

    const frontendStaff = allAssigned.filter((e) => {
      const r = (e.role || "").toLowerCase();
      const pr = (e.projectRole || "").toLowerCase();
      const d = (e.department || "").toUpperCase();
      return (
        r.includes("frontend") ||
        r.includes("ui") ||
        pr.includes("frontend") ||
        (d === "ENGINEERING" && !r.includes("backend") && !r.includes("database") && !r.includes("qa"))
      );
    });

    const backendStaff = allAssigned.filter((e) => {
      const r = (e.role || "").toLowerCase();
      const pr = (e.projectRole || "").toLowerCase();
      return r.includes("backend") || r.includes("api") || pr.includes("backend") || r.includes("architect");
    });

    const databaseStaff = allAssigned.filter((e) => {
      const r = (e.role || "").toLowerCase();
      const pr = (e.projectRole || "").toLowerCase();
      return r.includes("database") || r.includes("data") || pr.includes("database") || r.includes("architect");
    });

    const qaStaff = allAssigned.filter((e) => {
      const r = (e.role || "").toLowerCase();
      const pr = (e.projectRole || "").toLowerCase();
      const d = (e.department || "").toUpperCase();
      return r.includes("qa") || r.includes("test") || pr.includes("qa") || d === "QA";
    });

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      stage: p.stage,
      clientName: p.client?.companyName || "Client Delivery",
      roster: {
        frontend: frontendStaff,
        backend: backendStaff,
        database: databaseStaff,
        qa: qaStaff,
        all: allAssigned,
      },
      tasksCount: p.tasks.length,
      blockedTasksCount: p.tasks.filter((t) => t.status === "BLOCKED" || !!t.blockedReason).length,
    };
  });

  // 3. Fetch Real Conversations
  const conversationWhere: any = {};
  if (workspaceId) {
    conversationWhere.workspaceId = workspaceId;
  }

  if (!isAdmin && actorEmployeeId) {
    conversationWhere.participants = {
      some: { employeeId: actorEmployeeId },
    };
  } else if (!isAdmin && actorUserId) {
    conversationWhere.participants = {
      some: { userId: actorUserId },
    };
  }

  const conversations = await db.workConversation.findMany({
    where: conversationWhere,
    include: {
      project: { select: { id: true, name: true, code: true, stage: true } },
      task: { select: { id: true, code: true, title: true, layer: true, status: true, blockedReason: true } },
      participants: {
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true, department: true, role: true } },
          user: { select: { id: true, name: true, role: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  // 4. Fetch Current Employee's Real Active Work
  let myActiveTasks: any[] = [];
  let myEmployeeRecord: any = null;

  if (actorEmployeeId) {
    myEmployeeRecord = await db.employee.findUnique({
      where: { id: actorEmployeeId },
      include: { role: true, team: true },
    });

    myActiveTasks = await db.clientTask.findMany({
      where: {
        assigneeId: actorEmployeeId,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        deliverable: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // 5. System Totals & Signals
  const totalUnread = conversations.reduce((sum, c) => {
    const myP = c.participants.find(
      (p) => (actorEmployeeId && p.employeeId === actorEmployeeId) || (actorUserId && p.userId === actorUserId),
    );
    return sum + (myP?.unreadCount || 0);
  }, 0);

  const activeBlockers = conversations.filter((c) => c.isBlocker && c.blockerStatus !== "RESOLVED");
  const pendingHandoffs = conversations.filter((c) => c.isHandoff && c.handoffStatus === "PENDING");

  return {
    projects: structuredProjects,
    conversations,
    allEmployees: allWorkspaceEmployees,
    myEmployee: myEmployeeRecord,
    myActiveTasks,
    summary: {
      totalConversations: conversations.length,
      totalUnread,
      activeBlockersCount: activeBlockers.length,
      pendingHandoffsCount: pendingHandoffs.length,
    },
  };
}

/**
 * Get detailed conversation stream with full messages and active work context.
 */
export async function getConversationDetails(conversationId: string, actorEmployeeId?: string | null, actorUserId?: string | null) {
  const conversation = await db.workConversation.findUnique({
    where: { id: conversationId },
    include: {
      project: {
        include: {
          client: true,
          staffAllocations: {
            include: { employee: { include: { role: true } } },
          },
        },
      },
      task: {
        include: {
          deliverable: true,
          blueprint: true,
        },
      },
      participants: {
        include: {
          employee: { include: { role: true, team: true } },
          user: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return null;

  // Mark conversation as read for actor
  if (actorEmployeeId) {
    await db.workConversationParticipant.updateMany({
      where: { conversationId, employeeId: actorEmployeeId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
  } else if (actorUserId) {
    await db.workConversationParticipant.updateMany({
      where: { conversationId, userId: actorUserId },
      data: { unreadCount: 0, lastReadAt: new Date() },
    });
  }

  // Find linked dependencies for this work item if present
  let linkedDependency: { name: string; role: string; assignedEmployee?: any } | null = null;

  if (conversation.task) {
    const currentLayer = conversation.task.layer || "FRONTEND";
    let targetLayer = "BACKEND";
    let targetLabel = "Backend API & Data Services";

    if (currentLayer === "FRONTEND") {
      targetLayer = "BACKEND";
      targetLabel = "Backend API Endpoint";
    } else if (currentLayer === "BACKEND") {
      targetLayer = "DATABASE";
      targetLabel = "Database Schema & Migration";
    } else if (currentLayer === "QA") {
      targetLayer = "FRONTEND";
      targetLabel = "Feature Implementation";
    }

    // Find assigned employee on project for target layer
    const targetStaff = conversation.project?.staffAllocations.find(
      (s) => s.employee?.role?.name.toLowerCase().includes(targetLayer.toLowerCase()),
    );

    linkedDependency = {
      name: conversation.dependencyLabel || targetLabel,
      role: conversation.dependencyWorkstream || targetLayer,
      assignedEmployee: targetStaff?.employee
        ? {
            id: targetStaff.employee.id,
            name: targetStaff.employee.fullName,
            role: targetStaff.employee.role?.name,
          }
        : null,
    };
  }

  return {
    ...conversation,
    linkedDependency,
  };
}

/**
 * Dispatch a message into a work conversation.
 */
export async function sendWorkMessage({
  conversationId,
  senderEmployeeId,
  senderUserId,
  senderName,
  senderRole,
  content,
  messageType = "TEXT",
  metadata = {},
}: {
  conversationId: string;
  senderEmployeeId?: string | null;
  senderUserId?: string | null;
  senderName: string;
  senderRole?: string;
  content: string;
  messageType?: "TEXT" | "BLOCKER" | "HANDOFF" | "WORK_LINK" | "SYSTEM";
  metadata?: Record<string, any>;
}) {
  const conversation = await db.workConversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });

  if (!conversation) throw new Error("Conversation not found.");

  // Create message record
  const message = await db.workMessage.create({
    data: {
      conversationId,
      senderEmployeeId: senderEmployeeId || null,
      senderUserId: senderUserId || null,
      senderName,
      senderRole: senderRole || "Team Member",
      content,
      messageType,
      metadata: JSON.stringify(metadata),
    },
  });

  // Update conversation preview and timestamp
  await db.workConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: content.slice(0, 100),
      ...(messageType === "BLOCKER" ? { isBlocker: true, blockerStatus: "ACTIVE", blockerReason: content } : {}),
      ...(messageType === "HANDOFF" ? { isHandoff: true, handoffStatus: "PENDING" } : {}),
    },
  });

  // Increment unread count for other participants
  for (const participant of conversation.participants) {
    const isSender =
      (senderEmployeeId && participant.employeeId === senderEmployeeId) ||
      (senderUserId && participant.userId === senderUserId);

    if (!isSender) {
      await db.workConversationParticipant.update({
        where: { id: participant.id },
        data: {
          unreadCount: { increment: 1 },
        },
      });

      // If employee, also post high-signal inbox alert
      if (participant.employeeId) {
        await db.employeeInboxItem.create({
          data: {
            employeeId: participant.employeeId,
            category: messageType === "BLOCKER" ? "NEEDS_ACTION" : "INFORMATION",
            title: messageType === "BLOCKER" ? `🚨 Blocker Reported: ${senderName}` : `Message from ${senderName}`,
            whatChanged: content.slice(0, 120),
            whyItMatters: `New activity in work thread: ${conversation.title}`,
            whatToDo: "Open Messages to review and reply.",
            actionUrl: `/messages?thread=${conversationId}`,
          },
        });
      }
    }
  }

  return message;
}

/**
 * 1-Click: Contact Dependency Owner (e.g. Frontend clicks [Contact Backend]).
 * Finds existing thread or creates a dedicated work conversation automatically.
 */
export async function startOrGetWorkThread({
  workspaceId,
  actorEmployeeId,
  actorUserId,
  actorName,
  actorRole,
  targetEmployeeId,
  projectId,
  taskId,
  dependencyWorkstream,
  dependencyLabel,
}: {
  workspaceId: string;
  actorEmployeeId?: string | null;
  actorUserId?: string | null;
  actorName: string;
  actorRole?: string;
  targetEmployeeId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  dependencyWorkstream?: string | null;
  dependencyLabel?: string | null;
}) {
  let project: any = null;
  let task: any = null;
  let targetEmployee: any = null;

  if (projectId) {
    project = await db.clientProject.findUnique({ where: { id: projectId } });
  }

  if (taskId) {
    task = await db.clientTask.findUnique({ where: { id: taskId } });
  }

  if (targetEmployeeId) {
    targetEmployee = await db.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { role: true },
    });
  }

  // Look for existing thread with matching participants and task/project
  const existingThread = await db.workConversation.findFirst({
    where: {
      workspaceId,
      ...(taskId ? { taskId } : projectId ? { projectId } : {}),
      participants: {
        some: {
          OR: [
            ...(actorEmployeeId ? [{ employeeId: actorEmployeeId }] : []),
            ...(targetEmployeeId ? [{ employeeId: targetEmployeeId }] : []),
          ],
        },
      },
    },
  });

  if (existingThread) {
    return existingThread;
  }

  // Generate automated context title
  const title = task
    ? `${task.code || "Work"}: ${task.title}`
    : project
    ? `${project.name} · ${targetEmployee?.fullName || "Team Room"}`
    : targetEmployee
    ? `Direct: ${targetEmployee.fullName}`
    : "Work Communication";

  // Create new work conversation
  const newConversation = await db.workConversation.create({
    data: {
      workspaceId,
      type: taskId ? "WORK_ITEM" : projectId ? "PROJECT" : "DIRECT",
      title,
      projectId: projectId || null,
      taskId: taskId || null,
      workstream: task?.layer || "ENGINEERING",
      dependencyWorkstream: dependencyWorkstream || null,
      dependencyLabel: dependencyLabel || null,
      lastMessagePreview: "Conversation initiated with attached work context.",
      participants: {
        create: [
          ...(actorEmployeeId
            ? [{ employeeId: actorEmployeeId, role: actorRole || "MEMBER", unreadCount: 0 }]
            : actorUserId
            ? [{ userId: actorUserId, role: "ADMIN", unreadCount: 0 }]
            : []),
          ...(targetEmployeeId && targetEmployeeId !== actorEmployeeId
            ? [{ employeeId: targetEmployeeId, role: "MEMBER", unreadCount: 0 }]
            : []),
        ],
      },
    },
  });

  // Automatically seed initial work context message
  await db.workMessage.create({
    data: {
      conversationId: newConversation.id,
      senderEmployeeId: actorEmployeeId || null,
      senderUserId: actorUserId || null,
      senderName: actorName,
      senderRole: actorRole || "Specialist",
      content: `Opened work thread for ${task?.title || project?.name || "Project Delivery"}.`,
      messageType: "WORK_LINK",
      metadata: JSON.stringify({
        projectName: project?.name,
        taskCode: task?.code,
        taskTitle: task?.title,
        layer: task?.layer,
        dependency: dependencyLabel,
      }),
    },
  });

  return newConversation;
}

/**
 * Report a Blocker directly from assigned work.
 */
export async function reportWorkBlocker({
  workspaceId,
  actorEmployeeId,
  actorName,
  actorRole,
  projectId,
  taskId,
  blockerReason,
  waitingOnWorkstream = "BACKEND",
  waitingOnLabel,
}: {
  workspaceId: string;
  actorEmployeeId: string;
  actorName: string;
  actorRole: string;
  projectId: string;
  taskId: string;
  blockerReason: string;
  waitingOnWorkstream?: string;
  waitingOnLabel?: string;
}) {
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) throw new Error("Task not found.");

  // Update task state in database
  await db.clientTask.update({
    where: { id: taskId },
    data: {
      status: "BLOCKED",
      blockedReason: blockerReason,
    },
  });

  // Find workspace admin / owner
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: true },
  });

  // Find target employee responsible for the dependency on this project
  const dependencyStaff = await db.projectStaffAllocation.findFirst({
    where: {
      projectId,
      employee: {
        role: {
          name: { contains: waitingOnWorkstream },
        },
      },
    },
    include: { employee: true },
  });

  // Create or get conversation
  const thread = await startOrGetWorkThread({
    workspaceId,
    actorEmployeeId,
    actorName,
    actorRole,
    targetEmployeeId: dependencyStaff?.employeeId || null,
    projectId,
    taskId,
    dependencyWorkstream: waitingOnWorkstream,
    dependencyLabel: waitingOnLabel || `${waitingOnWorkstream} Dependency`,
  });

  // Post blocker message
  const blockerMsg = await sendWorkMessage({
    conversationId: thread.id,
    senderEmployeeId: actorEmployeeId,
    senderName: actorName,
    senderRole: actorRole,
    content: blockerReason,
    messageType: "BLOCKER",
    metadata: {
      taskId: task.id,
      taskCode: task.code,
      taskTitle: task.title,
      projectName: task.project?.name,
      fromLayer: task.layer || "FRONTEND",
      waitingFor: waitingOnLabel || waitingOnWorkstream,
    },
  });

  // If workspace has an owner user, ensure they are in the thread
  if (workspace?.ownerId) {
    const adminParticipant = await db.workConversationParticipant.findFirst({
      where: { conversationId: thread.id, userId: workspace.ownerId },
    });
    if (!adminParticipant) {
      await db.workConversationParticipant.create({
        data: {
          conversationId: thread.id,
          userId: workspace.ownerId,
          role: "ADMIN",
          unreadCount: 1,
        },
      });
    }
  }

  return { ok: true, threadId: thread.id, message: blockerMsg };
}

/**
 * 1-Click Handoff (e.g. Frontend sends completed work to QA).
 */
export async function sendWorkHandoffToQA({
  workspaceId,
  actorEmployeeId,
  actorName,
  actorRole,
  projectId,
  taskId,
  proofSummary,
}: {
  workspaceId: string;
  actorEmployeeId: string;
  actorName: string;
  actorRole: string;
  projectId: string;
  taskId: string;
  proofSummary?: string;
}) {
  const task = await db.clientTask.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          staffAllocations: {
            include: { employee: { include: { role: true } } },
          },
        },
      },
    },
  });

  if (!task) throw new Error("Task not found.");

  // Find QA engineer assigned to project
  const qaStaff = task.project?.staffAllocations.find(
    (s) => s.employee?.role?.name.toLowerCase().includes("qa") || s.employee?.department === "QA",
  );

  const thread = await startOrGetWorkThread({
    workspaceId,
    actorEmployeeId,
    actorName,
    actorRole,
    targetEmployeeId: qaStaff?.employeeId || null,
    projectId,
    taskId,
    dependencyWorkstream: "QA",
    dependencyLabel: "QA Verification & Test Execution",
  });

  const handoffMsg = await sendWorkMessage({
    conversationId: thread.id,
    senderEmployeeId: actorEmployeeId,
    senderName: actorName,
    senderRole: actorRole,
    content: proofSummary || `Work completed for ${task.title}. Ready for QA testing & acceptance criteria verification.`,
    messageType: "HANDOFF",
    metadata: {
      taskCode: task.code,
      taskTitle: task.title,
      projectName: task.project?.name,
      proofSummary,
      status: "READY_FOR_QA",
    },
  });

  // Update task status
  await db.clientTask.update({
    where: { id: taskId },
    data: { status: "IN_REVIEW" },
  });

  return { ok: true, threadId: thread.id, message: handoffMsg };
}

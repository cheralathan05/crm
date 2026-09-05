import { db } from "@/lib/db";

export type ProjectTeamName = "FRONTEND" | "BACKEND" | "DATABASE" | "QA";

export interface ProjectTeamMemberSummary {
  id: string; // allocation id
  employeeId: string;
  userId?: string | null;
  name: string;
  email: string;
  role: string;
  team: ProjectTeamName;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  reviewCount: number;
  status: "WORKING" | "AVAILABLE" | "IN_REVIEW";
  currentTaskTitle?: string | null;
  allocationPercentage: number;
  joinedAt: string;
}

export interface ProjectTeamGroup {
  teamName: ProjectTeamName;
  displayName: string;
  memberCount: number;
  members: ProjectTeamMemberSummary[];
  assignedTasksCount: number;
  completedTasksCount: number;
  activeWorkloadCount: number;
  blockersCount: number;
}

export interface ProjectTeamOverviewData {
  projectId: string;
  projectName: string;
  projectCode?: string | null;
  totalMembers: number;
  teams: Record<ProjectTeamName, ProjectTeamGroup>;
  communication: {
    unreadCount: number;
    directCount: number;
    teamCount: number;
    crossTeamCount: number;
  };
  attention: {
    blockersCount: number;
    reviewsCount: number;
    dependenciesCount: number;
  };
  unassignedTasksCount: number;
  activeTasksCount: number;
}

/**
 * Calculates complete, real project team structure, member workloads,
 * communication stats, and attention items directly from the database.
 */
export async function getProjectTeamOverview(
  projectId: string,
  currentUserId?: string | null
): Promise<ProjectTeamOverviewData> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, code: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // 1. Fetch real allocations (memberships) for this project
  const allocations = await db.projectStaffAllocation.findMany({
    where: {
      projectId,
      releasedAt: null,
      status: "ACTIVE",
    },
    include: {
      employee: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          email: true,
          employeeCode: true,
          status: true,
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // 2. Fetch all real tasks for this project
  const tasks = await db.clientTask.findMany({
    where: { projectId },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      workstream: true,
      layer: true,
      assigneeId: true,
      assigneeName: true,
      blockedReason: true,
      dependencies: {
        select: { id: true, dependsOnTask: { select: { status: true } } },
      },
    },
  });

  // 3. Fetch real conversations for communication stats
  const conversations = await db.workConversation.findMany({
    where: { projectId },
    select: {
      id: true,
      type: true,
      workstream: true,
      targetWorkstream: true,
      isBlocker: true,
      lastMessageAt: true,
      messages: {
        select: { id: true, createdAt: true },
        take: 1,
      },
      participants: {
        select: { id: true, employeeId: true, userId: true, lastReadAt: true },
      },
    },
  });

  // 4. Calculate communication stats
  let directCount = 0;
  let teamCount = 0;
  let crossTeamCount = 0;
  let unreadCount = 0;

  for (const c of conversations) {
    if (c.type === "DIRECT") directCount++;
    else if (c.type === "TEAM") teamCount++;
    else if (c.type === "CROSS-TEAM") crossTeamCount++;

    if (currentUserId) {
      const part = c.participants.find((p) => p.userId === currentUserId);
      if (part && c.lastMessageAt) {
        if (!part.lastReadAt || new Date(part.lastReadAt) < new Date(c.lastMessageAt)) {
          unreadCount++;
        }
      }
    }
  }

  // 5. Calculate attention items from real tasks
  const blockersCount = tasks.filter(
    (t) => t.status === "BLOCKED" || !!t.blockedReason
  ).length;

  const reviewsCount = tasks.filter((t) => t.status === "IN_REVIEW").length;

  const dependenciesCount = tasks.filter((t) => {
    if (t.status === "COMPLETED" || t.status === "DONE") return false;
    return t.dependencies.some(
      (dep) => dep.dependsOnTask && dep.dependsOnTask.status !== "COMPLETED" && dep.dependsOnTask.status !== "DONE"
    );
  }).length;

  const unassignedTasksCount = tasks.filter(
    (t) => !t.assigneeId && !t.assigneeName
  ).length;

  const activeTasksCount = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "DONE"
  ).length;

  // 6. Build the 4 core teams
  const teamKeys: ProjectTeamName[] = ["FRONTEND", "BACKEND", "DATABASE", "QA"];
  const teams: Record<ProjectTeamName, ProjectTeamGroup> = {
    FRONTEND: {
      teamName: "FRONTEND",
      displayName: "Frontend",
      memberCount: 0,
      members: [],
      assignedTasksCount: 0,
      completedTasksCount: 0,
      activeWorkloadCount: 0,
      blockersCount: 0,
    },
    BACKEND: {
      teamName: "BACKEND",
      displayName: "Backend",
      memberCount: 0,
      members: [],
      assignedTasksCount: 0,
      completedTasksCount: 0,
      activeWorkloadCount: 0,
      blockersCount: 0,
    },
    DATABASE: {
      teamName: "DATABASE",
      displayName: "Database",
      memberCount: 0,
      members: [],
      assignedTasksCount: 0,
      completedTasksCount: 0,
      activeWorkloadCount: 0,
      blockersCount: 0,
    },
    QA: {
      teamName: "QA",
      displayName: "QA",
      memberCount: 0,
      members: [],
      assignedTasksCount: 0,
      completedTasksCount: 0,
      activeWorkloadCount: 0,
      blockersCount: 0,
    },
  };

  // Group allocations into teams
  for (const alloc of allocations) {
    const rawTeam = (alloc.teamName || alloc.workstream || "FRONTEND").toUpperCase();
    const teamKey: ProjectTeamName = teamKeys.includes(rawTeam as ProjectTeamName)
      ? (rawTeam as ProjectTeamName)
      : "FRONTEND";

    const emp = alloc.employee;
    // Find all tasks assigned to this employee
    const empTasks = tasks.filter(
      (t) =>
        (t.assigneeId && (t.assigneeId === emp.id || (emp.userId && t.assigneeId === emp.userId))) ||
        (t.assigneeName && t.assigneeName.toLowerCase() === emp.fullName.toLowerCase())
    );

    const completed = empTasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "DONE"
    ).length;

    const inProgress = empTasks.filter((t) => t.status === "IN_PROGRESS").length;

    const inReview = empTasks.filter((t) => t.status === "IN_REVIEW").length;

    let memberStatus: "WORKING" | "AVAILABLE" | "IN_REVIEW" = "AVAILABLE";
    if (inReview > 0) memberStatus = "IN_REVIEW";
    else if (inProgress > 0 || empTasks.length > completed) memberStatus = "WORKING";

    const currentTask = empTasks.find((t) => t.status === "IN_PROGRESS") || empTasks.find((t) => t.status !== "COMPLETED" && t.status !== "DONE");

    const memberSummary: ProjectTeamMemberSummary = {
      id: alloc.id,
      employeeId: emp.id,
      userId: emp.userId,
      name: emp.fullName,
      email: emp.email,
      role: alloc.projectRole || emp.role?.name || "Developer",
      team: teamKey,
      assignedCount: empTasks.length,
      completedCount: completed,
      inProgressCount: inProgress,
      reviewCount: inReview,
      status: memberStatus,
      currentTaskTitle: currentTask ? `${currentTask.code || "TASK"}: ${currentTask.title}` : null,
      allocationPercentage: alloc.allocationPercentage,
      joinedAt: alloc.joinedAt.toISOString(),
    };

    teams[teamKey].members.push(memberSummary);
    teams[teamKey].memberCount++;
    teams[teamKey].assignedTasksCount += empTasks.length;
    teams[teamKey].completedTasksCount += completed;
    teams[teamKey].activeWorkloadCount += (empTasks.length - completed);
  }

  // Calculate team-specific blockers and tasks by discipline
  for (const t of tasks) {
    const ws = (t.workstream || t.layer || "").toUpperCase();
    let matchedKey: ProjectTeamName | null = null;
    if (ws.includes("FRONTEND") || ws.includes("UI") || ws.includes("DESIGN")) matchedKey = "FRONTEND";
    else if (ws.includes("BACKEND") || ws.includes("API")) matchedKey = "BACKEND";
    else if (ws.includes("DATA") || ws.includes("SCHEMA")) matchedKey = "DATABASE";
    else if (ws.includes("QA") || ws.includes("TEST")) matchedKey = "QA";

    if (matchedKey && (t.status === "BLOCKED" || !!t.blockedReason)) {
      teams[matchedKey].blockersCount++;
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    projectCode: project.code,
    totalMembers: allocations.length,
    teams,
    communication: {
      unreadCount,
      directCount,
      teamCount,
      crossTeamCount,
    },
    attention: {
      blockersCount,
      reviewsCount,
      dependenciesCount,
    },
    unassignedTasksCount,
    activeTasksCount,
  };
}

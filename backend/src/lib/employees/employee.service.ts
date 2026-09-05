import { db } from "@/lib/db";

export type TeamPulseMetrics = {
  totalPeople: number;
  active: number;
  pendingInvites: number;
  suspended: number;
  unassigned: number;
  activeWork: number;
  overCapacity: number;
  availableCapacity: number;
  teamUtilization: number;
  accessIssues: number;
};

export type AttentionItem = {
  id: string;
  type: "OVERLOADED" | "UNASSIGNED_TASK" | "EXPIRING_INVITE" | "BLOCKED_WORK" | "OVERDUE_WORK" | "ACCESS_ISSUE";
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  recordId?: string;
  link?: string;
};

export type TeamHealthReport = {
  activeEmployees: number;
  assignedEmployees: number;
  unassignedEmployees: number;
  employeesWithNoActiveWork: number;
  employeesWithOverdueWork: number;
  employeesWithBlockedWork: number;
  employeesAboveCapacity: number;
  employeesWithoutCapabilities: number;
  pendingInvitations: number;
  accessAnomalies: number;
  totalAssignedHours: number;
  totalCapacityHours: number;
  teamUtilization: number;
  needsAttention: AttentionItem[];
};

/**
 * Standard System Roles seeded if organization has no roles defined yet.
 */
export const DEFAULT_ORG_ROLES = [
  {
    name: "Staff Full-Stack Engineer",
    code: "ROLE-ENG-STAFF",
    department: "ENGINEERING",
    purpose: "Architects and delivers cross-layer application capabilities from database schemas to client UIs.",
    responsibilities: JSON.stringify([
      "Full-stack architecture and implementation",
      "API design and database performance optimization",
      "Code review and technical mentorship",
      "Zero-regression verification",
    ]),
    requiredCapabilities: JSON.stringify([
      "TypeScript",
      "Next.js",
      "Node.js",
      "Prisma / SQL",
      "System Architecture",
    ]),
    permissionTemplate: JSON.stringify({
      projects: ["view", "edit_assigned"],
      tasks: ["view", "create", "edit_assigned", "verify"],
      requirements: ["view"],
      proposals: ["view"],
      deliverables: ["view", "submit"],
      employees: ["view"],
      settings: [],
    }),
  },
  {
    name: "Backend & Database Architect",
    code: "ROLE-ENG-BACKEND",
    department: "ENGINEERING",
    purpose: "Designs scalable database models, transaction boundaries, and secure API contracts.",
    responsibilities: JSON.stringify([
      "Data layer schemas and migration execution",
      "REST & RPC endpoint implementation",
      "Authentication and authorization policies",
      "Backend unit and integration test specs",
    ]),
    requiredCapabilities: JSON.stringify([
      "Node.js",
      "PostgreSQL / SQLite",
      "Prisma",
      "REST / GraphQL APIs",
      "Security & RBAC",
    ]),
    permissionTemplate: JSON.stringify({
      projects: ["view", "edit_assigned"],
      tasks: ["view", "create", "edit_assigned", "verify"],
      requirements: ["view"],
      proposals: ["view"],
      deliverables: ["view", "submit"],
      employees: ["view"],
      settings: [],
    }),
  },
  {
    name: "Frontend UI/UX Engineer",
    code: "ROLE-ENG-FRONTEND",
    department: "ENGINEERING",
    purpose: "Crafts high-performance, accessible, and pixel-perfect client presentation interfaces.",
    responsibilities: JSON.stringify([
      "Component architecture and design system implementation",
      "State management and client cache coordination",
      "Responsive UI & micro-interactions",
      "E2E and component visual testing",
    ]),
    requiredCapabilities: JSON.stringify([
      "React 19",
      "Next.js App Router",
      "Tailwind CSS",
      "TypeScript",
      "Accessibility / WCAG",
    ]),
    permissionTemplate: JSON.stringify({
      projects: ["view", "edit_assigned"],
      tasks: ["view", "edit_assigned", "verify"],
      requirements: ["view"],
      proposals: ["view"],
      deliverables: ["view", "submit"],
      employees: ["view"],
      settings: [],
    }),
  },
  {
    name: "QA Automation & Verification Lead",
    code: "ROLE-QA-LEAD",
    department: "QA",
    purpose: "Ensures all deliverable acceptance criteria and performance gates are verified with proof.",
    responsibilities: JSON.stringify([
      "Test specification design and automated test suites",
      "Acceptance criteria validation and evidence verification",
      "Regression testing and blocker diagnostics",
      "Client readiness sign-off",
    ]),
    requiredCapabilities: JSON.stringify([
      "Playwright / Cypress",
      "Jest / Vitest",
      "API Testing",
      "CI/CD Pipelines",
      "Security Testing",
    ]),
    permissionTemplate: JSON.stringify({
      projects: ["view"],
      tasks: ["view", "verify", "comment"],
      requirements: ["view"],
      proposals: ["view"],
      deliverables: ["view", "approve"],
      employees: ["view"],
      settings: [],
    }),
  },
  {
    name: "Product & Delivery Lead",
    code: "ROLE-PROD-LEAD",
    department: "PRODUCT",
    purpose: "Transforms approved client scope into verified blueprints, workstreams, and milestone deliverables.",
    responsibilities: JSON.stringify([
      "Blueprint and workstream orchestration",
      "Cross-functional sprint capacity management",
      "Client change request and impact evaluation",
      "Milestone signoff & delivery acceptance",
    ]),
    requiredCapabilities: JSON.stringify([
      "Technical Product Management",
      "Agile / Waterfall Blueprints",
      "Client Stakeholder Management",
      "Scrum & Capacity Planning",
    ]),
    permissionTemplate: JSON.stringify({
      projects: ["view", "create", "edit", "assign"],
      tasks: ["view", "create", "edit", "assign", "verify"],
      requirements: ["view", "approve"],
      proposals: ["view", "approve"],
      deliverables: ["view", "create", "approve"],
      employees: ["view", "invite"],
      settings: ["view"],
    }),
  },
];

/**
 * Seed default roles if workspace has none.
 */
export async function ensureDefaultRoles(workspaceId: string) {
  const count = await db.organizationRole.count({ where: { workspaceId } });
  if (count === 0) {
    for (const role of DEFAULT_ORG_ROLES) {
      await db.organizationRole.create({
        data: {
          workspaceId,
          name: role.name,
          code: role.code,
          department: role.department,
          purpose: role.purpose,
          responsibilities: role.responsibilities,
          requiredCapabilities: role.requiredCapabilities,
          permissionTemplate: role.permissionTemplate,
          isSystemDefault: true,
        },
      });
    }
  }
}

/**
 * Compute Executive Team Pulse directly from the real database.
 */
export async function getTeamPulseMetrics(workspaceId: string): Promise<TeamPulseMetrics> {
  const employees = await db.employee.findMany({
    where: { workspaceId, status: { not: "OFFBOARDED" } },
    include: {
      projectAllocations: { where: { releasedAt: null } },
    },
  });

  const pendingInvitesCount = await db.employeeInvitation.count({
    where: {
      workspaceId,
      status: { in: ["SENT", "OPENED", "PENDING"] },
    },
  });

  let activeCount = 0;
  let suspendedCount = 0;
  let onProjectsCount = 0;
  let unassignedCount = 0;
  let overCapacityCount = 0;
  let availableCapacityCount = 0;
  let accessIssuesCount = 0;
  let totalAssignedHours = 0;
  let totalCapacityHours = 0;
  let totalActiveTasks = 0;

  for (const emp of employees) {
    if (emp.status === "ACTIVE") activeCount++;
    if (emp.status === "SUSPENDED") suspendedCount++;

    const activeAllocations = emp.projectAllocations.length;
    if (activeAllocations > 0) onProjectsCount++;
    else if (emp.status === "ACTIVE") unassignedCount++;

    totalCapacityHours += emp.capacityTargetHours || 40;

    // Calculate active assigned task hours
    const activeTasks = await db.clientTask.findMany({
      where: {
        assigneeId: emp.id,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
      },
    });

    totalActiveTasks += activeTasks.length;
    const taskHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
    totalAssignedHours += taskHours;

    const capacityRatio = taskHours / (emp.capacityTargetHours || 40);

    if (capacityRatio > 1.0) overCapacityCount++;
    else if (capacityRatio < 0.8 && emp.status === "ACTIVE") availableCapacityCount++;

    // Access issue check: Active employee with missing role
    if (emp.status === "ACTIVE" && !emp.roleId) {
      accessIssuesCount++;
    }
  }

  const teamUtilization = totalCapacityHours > 0
    ? Math.min(Math.round((totalAssignedHours / totalCapacityHours) * 100), 200)
    : 0;

  return {
    totalPeople: employees.length,
    active: activeCount,
    pendingInvites: pendingInvitesCount,
    suspended: suspendedCount,
    unassigned: unassignedCount,
    activeWork: totalActiveTasks,
    overCapacity: overCapacityCount,
    availableCapacity: availableCapacityCount,
    teamUtilization,
    accessIssues: accessIssuesCount,
  };
}

/**
 * Compute detailed Team Health diagnostic report with "WHAT NEEDS ATTENTION".
 */
export async function getTeamHealthReport(workspaceId: string): Promise<TeamHealthReport> {
  const employees = await db.employee.findMany({
    where: { workspaceId, status: { not: "OFFBOARDED" } },
    include: {
      projectAllocations: { where: { releasedAt: null } },
      role: true,
    },
  });

  const now = new Date();
  const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

  let assignedCount = 0;
  let unassignedCount = 0;
  let noActiveWorkCount = 0;
  let overdueWorkCount = 0;
  let blockedWorkCount = 0;
  let aboveCapacityCount = 0;
  let missingCapabilitiesCount = 0;
  let accessAnomaliesCount = 0;
  let totalAssignedHours = 0;
  let totalCapacityHours = 0;

  const needsAttention: AttentionItem[] = [];

  for (const emp of employees) {
    totalCapacityHours += emp.capacityTargetHours || 40;

    if (emp.projectAllocations.length > 0) assignedCount++;
    else if (emp.status === "ACTIVE") unassignedCount++;

    const activeTasks = await db.clientTask.findMany({
      where: {
        assigneeId: emp.id,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
      },
    });

    if (emp.status === "ACTIVE" && activeTasks.length === 0) noActiveWorkCount++;

    const blockedTasks = activeTasks.filter((t) => t.status === "BLOCKED");
    if (blockedTasks.length > 0) {
      blockedWorkCount += blockedTasks.length;
      needsAttention.push({
        id: `blocked-${emp.id}`,
        type: "BLOCKED_WORK",
        severity: "HIGH",
        title: `${emp.fullName} has ${blockedTasks.length} blocked task(s)`,
        description: `Blocked on: ${blockedTasks.map((t) => t.title).join(", ")}`,
        recordId: emp.id,
      });
    }

    const overdueTasks = activeTasks.filter((t) => t.dueAt && new Date(t.dueAt) < now);
    if (overdueTasks.length > 0) {
      overdueWorkCount += overdueTasks.length;
      needsAttention.push({
        id: `overdue-${emp.id}`,
        type: "OVERDUE_WORK",
        severity: "HIGH",
        title: `${emp.fullName} has ${overdueTasks.length} overdue task(s)`,
        description: `Overdue item: ${overdueTasks[0].title}`,
        recordId: emp.id,
      });
    }

    const taskHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
    totalAssignedHours += taskHours;

    const capTarget = emp.capacityTargetHours || 40;
    if (taskHours > capTarget) {
      aboveCapacityCount++;
      const capPct = Math.round((taskHours / capTarget) * 100);
      needsAttention.push({
        id: `overloaded-${emp.id}`,
        type: "OVERLOADED",
        severity: "MEDIUM",
        title: `${emp.fullName} is overloaded at ${capPct}% capacity`,
        description: `Assigned ${taskHours}h of work against a target of ${capTarget}h/week.`,
        recordId: emp.id,
      });
    }

    let caps: any[] = [];
    try {
      caps = JSON.parse(emp.capabilities || "[]");
    } catch {}
    if (caps.length === 0 && emp.status === "ACTIVE") missingCapabilitiesCount++;

    if (emp.status === "ACTIVE" && !emp.roleId) {
      accessAnomaliesCount++;
      needsAttention.push({
        id: `access-${emp.id}`,
        type: "ACCESS_ISSUE",
        severity: "HIGH",
        title: `${emp.fullName} has no assigned organization role`,
        description: "Active team member without role permissions.",
        recordId: emp.id,
      });
    }
  }

  // Check unassigned critical/high priority tasks
  const unassignedTasks = await db.clientTask.findMany({
    where: {
      client: { workspaceId },
      assigneeId: null,
      status: { in: ["TODO", "IN_PROGRESS", "BACKLOG", "READY"] },
      priority: { in: ["HIGH", "URGENT"] },
    },
    take: 5,
  });

  for (const ut of unassignedTasks) {
    needsAttention.push({
      id: `unassigned-task-${ut.id}`,
      type: "UNASSIGNED_TASK",
      severity: ut.priority === "URGENT" ? "HIGH" : "MEDIUM",
      title: `Unassigned ${ut.priority} Task: ${ut.title}`,
      description: `Task in backlog without an assigned engineer.`,
      recordId: ut.id,
    });
  }

  // Check expiring invitations
  const expiringInvites = await db.employeeInvitation.findMany({
    where: {
      workspaceId,
      status: { in: ["SENT", "OPENED"] },
      expiresAt: { lte: in48Hours, gte: now },
    },
  });

  for (const inv of expiringInvites) {
    needsAttention.push({
      id: `expiring-inv-${inv.id}`,
      type: "EXPIRING_INVITE",
      severity: "LOW",
      title: `Invitation to ${inv.recipientEmail} expiring soon`,
      description: `Expires on ${new Date(inv.expiresAt).toLocaleDateString()}. Consider resending.`,
      recordId: inv.id,
    });
  }

  const pendingInvites = await db.employeeInvitation.count({
    where: { workspaceId, status: { in: ["SENT", "OPENED", "PENDING"] } },
  });

  const teamUtilization = totalCapacityHours > 0
    ? Math.min(Math.round((totalAssignedHours / totalCapacityHours) * 100), 200)
    : 0;

  return {
    activeEmployees: employees.filter((e) => e.status === "ACTIVE").length,
    assignedEmployees: assignedCount,
    unassignedEmployees: unassignedCount,
    employeesWithNoActiveWork: noActiveWorkCount,
    employeesWithOverdueWork: overdueWorkCount,
    employeesWithBlockedWork: blockedWorkCount,
    employeesAboveCapacity: aboveCapacityCount,
    employeesWithoutCapabilities: missingCapabilitiesCount,
    pendingInvitations: pendingInvites,
    accessAnomalies: accessAnomaliesCount,
    totalAssignedHours,
    totalCapacityHours,
    teamUtilization,
    needsAttention,
  };
}

/**
 * Enhanced Employee Directory search understanding business semantic keywords:
 * e.g. "frontend", "backend", "qa", "unassigned", "overloaded", project names, employee codes.
 */
export async function getEmployeeDirectory(
  workspaceId: string,
  options?: {
    filter?: string;
    search?: string;
    department?: string;
    roleId?: string;
    sortBy?: "name" | "recently_added" | "last_active" | "workload" | "due_work" | "status";
  },
) {
  const query = options?.search?.trim().toLowerCase() || "";

  // Base database filter
  const whereClause: any = {
    workspaceId,
    ...(options?.department ? { department: options.department } : {}),
    ...(options?.roleId ? { roleId: options.roleId } : {}),
  };

  if (options?.filter === "ACTIVE") whereClause.status = "ACTIVE";
  else if (options?.filter === "INVITED") whereClause.status = "INVITED";
  else if (options?.filter === "SUSPENDED") whereClause.status = "SUSPENDED";
  else if (options?.filter === "OFFBOARDED") whereClause.status = "OFFBOARDED";

  const employees = await db.employee.findMany({
    where: whereClause,
    include: {
      role: true,
      team: true,
      projectAllocations: {
        where: { releasedAt: null },
        include: {
          project: { select: { id: true, name: true, code: true, stage: true } },
        },
      },
      invitations: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      user: {
        select: { id: true, emailVerified: true, lastLoginAt: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  // Enrich each employee with real task stats and capacity
  const enriched = await Promise.all(
    employees.map(async (emp) => {
      const activeTasks = await db.clientTask.findMany({
        where: {
          assigneeId: emp.id,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
        orderBy: { dueAt: "asc" },
      });

      const totalAssignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
      const capacityTargetHours = emp.capacityTargetHours || 40.0;
      const capacityPercentage = Math.round((totalAssignedHours / capacityTargetHours) * 100);

      const blockedCount = activeTasks.filter((t) => t.status === "BLOCKED").length;
      const overdueCount = activeTasks.filter((t) => t.dueAt && new Date(t.dueAt) < now).length;
      const dueSoonCount = activeTasks.filter((t) => {
        if (!t.dueAt) return false;
        const due = new Date(t.dueAt);
        return due >= now && due.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000;
      }).length;

      let capabilities: any[] = [];
      try {
        capabilities = JSON.parse(emp.capabilities || "[]");
      } catch {}

      const isUnassigned = emp.projectAllocations.length === 0 && activeTasks.length === 0;
      const isOverloaded = capacityPercentage > 100;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode || "NOT ASSIGNED",
        fullName: emp.fullName,
        preferredName: emp.preferredName || emp.fullName,
        email: emp.email,
        phone: emp.phone || "NOT PROVIDED",
        avatar: emp.avatar,
        status: emp.status,
        department: emp.department,
        timezone: emp.timezone,
        location: emp.location || "Remote",
        employmentType: emp.employmentType,
        role: emp.role ? { id: emp.role.id, name: emp.role.name, code: emp.role.code } : null,
        team: emp.team ? { id: emp.team.id, name: emp.team.name, code: emp.team.code } : null,
        currentProjects: emp.projectAllocations.map((a) => ({
          id: a.project.id,
          name: a.project.name,
          code: a.project.code,
          stage: a.project.stage,
          role: a.projectRole,
          allocationPercentage: a.allocationPercentage,
        })),
        activeTaskCount: activeTasks.length,
        totalAssignedHours,
        capacityTargetHours,
        capacityPercentage,
        blockedCount,
        overdueCount,
        dueSoonCount,
        nextUpcomingDue: activeTasks[0]?.dueAt || null,
        capabilities,
        accessStatus: emp.user?.status === "ACTIVE" ? "ACTIVE" : emp.status === "INVITED" ? "PENDING_INVITE" : emp.roleId ? "ACTIVE" : "NO_ROLE",
        lastActiveAt: emp.lastActiveAt || emp.user?.lastLoginAt || null,
        joinedAt: emp.joinedAt,
        invitation: emp.invitations[0] || null,
        isUnassigned,
        isOverloaded,
      };
    }),
  );

  // Apply Semantic Search & Business Queries
  let filtered = enriched;

  if (query) {
    filtered = filtered.filter((emp) => {
      // Direct field match
      if (emp.fullName.toLowerCase().includes(query)) return true;
      if (emp.email.toLowerCase().includes(query)) return true;
      if (emp.employeeCode.toLowerCase().includes(query)) return true;
      if (emp.role?.name.toLowerCase().includes(query)) return true;
      if (emp.team?.name.toLowerCase().includes(query)) return true;

      // Projects match
      if (emp.currentProjects.some((p) => (p.name || "").toLowerCase().includes(query) || (p.code || "").toLowerCase().includes(query))) {
        return true;
      }

      // Capabilities skills match
      if (emp.capabilities.some((c: any) => {
        const skill = typeof c === "string" ? c : c.skill || c.name || "";
        return skill.toLowerCase().includes(query);
      })) {
        return true;
      }

      // Semantic keywords:
      if (query === "unassigned" && emp.isUnassigned) return true;
      if (query === "overloaded" && emp.isOverloaded) return true;
      if (query === "frontend" && (emp.department === "DESIGN" || emp.role?.name.toLowerCase().includes("frontend") || emp.capabilities.some((c: any) => String(c.skill || c).toLowerCase().includes("react") || String(c.skill || c).toLowerCase().includes("next")))) return true;
      if (query === "backend" && (emp.role?.name.toLowerCase().includes("backend") || emp.role?.name.toLowerCase().includes("database") || emp.capabilities.some((c: any) => String(c.skill || c).toLowerCase().includes("node") || String(c.skill || c).toLowerCase().includes("sql")))) return true;
      if (query === "qa" && (emp.department === "QA" || emp.role?.name.toLowerCase().includes("qa") || emp.role?.name.toLowerCase().includes("test"))) return true;

      return false;
    });
  }

  // Handle pulse filters
  if (options?.filter === "UNASSIGNED") {
    filtered = filtered.filter((e) => e.isUnassigned && e.status === "ACTIVE");
  } else if (options?.filter === "OVERLOADED") {
    filtered = filtered.filter((e) => e.isOverloaded);
  } else if (options?.filter === "AVAILABLE") {
    filtered = filtered.filter((e) => e.capacityPercentage < 80 && e.status === "ACTIVE");
  } else if (options?.filter === "ACCESS_ISSUES") {
    filtered = filtered.filter((e) => !e.role && e.status === "ACTIVE");
  }

  // Sorting
  if (options?.sortBy === "name") {
    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  } else if (options?.sortBy === "workload") {
    filtered.sort((a, b) => b.capacityPercentage - a.capacityPercentage);
  } else if (options?.sortBy === "due_work") {
    filtered.sort((a, b) => (b.overdueCount + b.dueSoonCount) - (a.overdueCount + a.dueSoonCount));
  } else if (options?.sortBy === "last_active") {
    filtered.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
  }

  return filtered;
}

/**
 * Get deep Employee Execution Workspace details with Work DNA & task lineage.
 */
export async function getEmployeeWorkspaceDetails(employeeId: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      role: true,
      team: {
        include: {
          teamLead: { select: { id: true, fullName: true, employeeCode: true } },
        },
      },
      user: true,
      projectAllocations: {
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true } },
            },
          },
        },
      },
      invitations: {
        orderBy: { createdAt: "desc" },
      },
      auditEvents: {
        take: 30,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) return null;

  // Retrieve assigned tasks with full Work DNA lineage
  const tasks = await db.clientTask.findMany({
    where: { assigneeId: employee.id },
    include: {
      project: { select: { id: true, name: true, code: true } },
      deliverable: { select: { id: true, title: true, category: true } },
      acceptanceCriteria: true,
      evidenceRecords: true,
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  // Parse JSON properties
  let secondaryResponsibilities: string[] = [];
  let accountabilities: string[] = [];
  let capabilities: any[] = [];
  let customPermissions: any = {};

  try { secondaryResponsibilities = JSON.parse(employee.secondaryResponsibilities || "[]"); } catch {}
  try { accountabilities = JSON.parse(employee.accountabilities || "[]"); } catch {}
  try { capabilities = JSON.parse(employee.capabilities || "[]"); } catch {}
  try { customPermissions = JSON.parse(employee.customPermissions || "{}"); } catch {}

  // Deliverables owned or contributed to
  const projectIds = (employee.projectAllocations || []).map((a: any) => a.projectId);
  const deliverables = await db.projectDeliverable.findMany({
    where: { projectId: { in: projectIds } },
    include: {
      project: { select: { id: true, name: true, code: true } },
      evidenceRecords: true,
    },
  });

  const now = new Date();
  const totalAssignedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
  const capacityPercentage = Math.round((totalAssignedHours / (employee.capacityTargetHours || 40)) * 100);

  const completedTasks = tasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED");
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const overdueTasks = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE" && t.status !== "COMPLETED");
  const dueSoonTasks = tasks.filter((t) => {
    if (!t.dueAt || t.status === "DONE" || t.status === "COMPLETED") return false;
    const due = new Date(t.dueAt);
    return due >= now && due.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000;
  });

  // Effective permissions explanation
  const effectivePermissions = {
    roleTemplate: employee.role ? JSON.parse(employee.role.permissionTemplate || "{}") : {},
    customOverrides: customPermissions,
    explanation: employee.role
      ? `Permissions granted via assigned role '${employee.role.name}' with standard department capabilities.`
      : "No organization role assigned. Workspace access is limited.",
  };

    // Build Submissions & Review Requests sent to Admin
    const rawSubmissions = await db.buildSubmission.findMany({
      where: { employeeId: employee.id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        proofs: true,
        reviewDecisions: { orderBy: { reviewedAt: "desc" } },
        build: { select: { id: true, featureName: true, status: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const formattedSubmissions = rawSubmissions.map((s) => {
      const matchingTask = tasks.find(
        (t) =>
          t.projectId === s.projectId &&
          (t.title.toLowerCase().includes(s.featureName.toLowerCase()) ||
            s.featureName.toLowerCase().includes(t.title.toLowerCase()) ||
            (t.deliverable && t.deliverable.title.toLowerCase().includes(s.featureName.toLowerCase())))
      );

      return {
        id: s.id,
        submissionCode: s.submissionCode,
        version: s.version,
        status: s.status,
        submittedAt: s.submittedAt.toISOString(),
        featureName: s.featureName,
        workstream: s.workstream,
        responsibility: s.responsibility,
        requirementText: s.requirementText,
        whatYouBuilt: s.whatYouBuilt,
        project: {
          id: s.project?.id,
          name: s.project?.name || "Project",
          code: s.project?.code || "PRJ",
        },
        task: matchingTask
          ? {
              id: matchingTask.id,
              code: matchingTask.code,
              title: matchingTask.title,
              status: matchingTask.status,
            }
          : null,
        proofs: s.proofs.map((p) => ({
          id: p.id,
          type: p.type,
          milestone: p.milestone,
          title: p.title,
          evidenceUrl: p.evidenceUrl,
          evidenceCode: p.evidenceCode,
          testOutcome: p.testOutcome,
          whatChanged: p.whatChanged,
          createdAt: p.createdAt.toISOString(),
        })),
        reviewDecisions: s.reviewDecisions.map((d) => ({
          id: d.id,
          decision: d.decision,
          reviewerName: d.reviewerName,
          comment: d.comment,
          reviewedAt: d.reviewedAt.toISOString(),
        })),
      };
    });

    return {
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        preferredName: employee.preferredName,
        email: employee.email,
        phone: employee.phone,
        avatar: employee.avatar,
        status: employee.status,
        department: employee.department,
        timezone: employee.timezone,
        location: employee.location,
        employmentType: employee.employmentType,
        primaryResponsibility: employee.primaryResponsibility,
        secondaryResponsibilities,
        accountabilities,
        capabilities,
        customPermissions,
        capacityTargetHours: employee.capacityTargetHours,
        joinedAt: employee.joinedAt,
        activatedAt: employee.activatedAt,
        lastActiveAt: employee.lastActiveAt,
        offboardedAt: employee.offboardedAt,
        offboardedReason: employee.offboardedReason,
        offboardedNotes: employee.offboardedNotes,
      },
      role: employee.role,
      team: employee.team,
      user: employee.user
        ? {
            id: employee.user.id,
            emailVerified: employee.user.emailVerified,
            status: employee.user.status,
            lastLoginAt: employee.user.lastLoginAt,
          }
        : null,
      executionHealth: {
        activeProjectsCount: employee.projectAllocations.length,
        activeTasksCount: tasks.length - completedTasks.length,
        completedTasksCount: completedTasks.length,
        blockedCount: blockedTasks.length,
        overdueCount: overdueTasks.length,
        dueSoonCount: dueSoonTasks.length,
        totalAssignedHours,
        capacityTargetHours: employee.capacityTargetHours,
        capacityPercentage,
        completionRate:
          tasks.length > 0
            ? Math.round((completedTasks.length / tasks.length) * 100)
            : 0,
      },
      projects: (employee.projectAllocations || []).map((a: any) => ({
        id: a.project.id,
        name: a.project.name,
        code: a.project.code,
        stage: a.project.stage,
        clientName:
          a.project.client?.company ||
          a.project.client?.name ||
          "Enterprise Client",
        projectRole: a.projectRole,
        allocationPercentage: a.allocationPercentage,
        workstream: a.workstream,
        joinedAt: a.joinedAt,
      })),
      tasks: tasks.map((t) => {
        const matchingSub = formattedSubmissions.find(
          (s) =>
            s.task?.id === t.id ||
            t.title.toLowerCase().includes(s.featureName.toLowerCase()) ||
            s.featureName.toLowerCase().includes(t.title.toLowerCase())
        );

        return {
          id: t.id,
          code: t.code,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          layer: t.layer,
          dueAt: t.dueAt,
          estimatedHours: t.estimatedHours,
          actualHours: t.actualHours,
          projectId: t.projectId,
          projectName: t.project?.name || "General",
          deliverableId: t.deliverableId,
          deliverableTitle: t.deliverable?.title,
          workstreamName: t.workstream || "ENGINEERING",
          sourceRequirementId: t.sourceRequirementId,
          sourceProposalId: t.sourceProposalId,
          criteriaCount: t.acceptanceCriteria.length,
          passedCriteriaCount: t.acceptanceCriteria.filter(
            (c: any) => c.status === "PASSED"
          ).length,
          evidenceCount: t.evidenceRecords.length,
          submission: matchingSub
            ? {
                id: matchingSub.id,
                submissionCode: matchingSub.submissionCode,
                version: matchingSub.version,
                status: matchingSub.status,
              }
            : null,
        };
      }),
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        status: d.status,
        acceptanceCriteria: d.acceptanceCriteria,
        projectId: d.projectId,
        projectName: d.project.name,
        evidenceCount: d.evidenceRecords.length,
      })),
      buildSubmissions: formattedSubmissions,
      permissions: effectivePermissions,
      invitations: employee.invitations || [],
      auditTrail: employee.auditEvents || [],
    };
  }

/**
 * Role Change with Capability Differential and Audit Event.
 */
export async function changeEmployeeRole(
  employeeId: string,
  newRoleId: string,
  actorName = "Admin",
) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { role: true },
  });
  if (!employee) throw new Error("Employee not found.");

  const newRole = await db.organizationRole.findUnique({
    where: { id: newRoleId },
  });
  if (!newRole) throw new Error("Target role not found.");

  const beforeRoleName = employee.role?.name || "None";

  const updated = await db.employee.update({
    where: { id: employeeId },
    data: { roleId: newRoleId },
    include: { role: true, team: true },
  });

  await db.employeeAuditEvent.create({
    data: {
      workspaceId: employee.workspaceId,
      employeeId: employee.id,
      action: "ROLE_CHANGED",
      actorName,
      detail: `Role changed from '${beforeRoleName}' to '${newRole.name}'.`,
      beforeState: JSON.stringify({ roleId: employee.roleId, roleName: beforeRoleName }),
      afterState: JSON.stringify({ roleId: newRole.id, roleName: newRole.name }),
    },
  });

  return updated;
}

/**
 * Team Move with Manager and Audit Event.
 */
export async function moveEmployeeTeam(
  employeeId: string,
  newTeamId: string,
  actorName = "Admin",
) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { team: true },
  });
  if (!employee) throw new Error("Employee not found.");

  const newTeam = await db.organizationTeam.findUnique({
    where: { id: newTeamId },
  });
  if (!newTeam) throw new Error("Target team not found.");

  const beforeTeamName = employee.team?.name || "None";

  const updated = await db.employee.update({
    where: { id: employeeId },
    data: { teamId: newTeamId },
    include: { role: true, team: true },
  });

  await db.employeeAuditEvent.create({
    data: {
      workspaceId: employee.workspaceId,
      employeeId: employee.id,
      action: "TEAM_CHANGED",
      actorName,
      detail: `Team changed from '${beforeTeamName}' to '${newTeam.name}'.`,
      beforeState: JSON.stringify({ teamId: employee.teamId, teamName: beforeTeamName }),
      afterState: JSON.stringify({ teamId: newTeam.id, teamName: newTeam.name }),
    },
  });

  return updated;
}

/**
 * Safe Offboarding: calculates active tasks/projects, reassigns or unassigns,
 * revokes access, and writes an immutable audit record.
 */
export async function offboardEmployee(
  employeeId: string,
  reassignToEmployeeId?: string,
  notes?: string,
  actorName = "Admin",
) {
  const emp = await db.employee.findUnique({
    where: { id: employeeId },
    include: { projectAllocations: true },
  });
  if (!emp) throw new Error("Employee not found.");

  // Reassign or unassign active tasks
  if (reassignToEmployeeId) {
    const replacement = await db.employee.findUnique({
      where: { id: reassignToEmployeeId },
    });
    if (replacement) {
      await db.clientTask.updateMany({
        where: {
          assigneeId: emp.id,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
        data: {
          assigneeId: replacement.id,
          assigneeName: replacement.fullName,
        },
      });
    }
  } else {
    await db.clientTask.updateMany({
      where: {
        assigneeId: emp.id,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
      },
      data: {
        assigneeId: null,
        assigneeName: null,
      },
    });
  }

  // Release project allocations
  await db.projectStaffAllocation.updateMany({
    where: { employeeId: emp.id, releasedAt: null },
    data: { releasedAt: new Date() },
  });

  // Set employee status to OFFBOARDED
  const updated = await db.employee.update({
    where: { id: emp.id },
    data: {
      status: "OFFBOARDED",
      offboardedAt: new Date(),
      offboardedNotes: notes || null,
    },
  });

  // Suspend associated user account if exists
  if (emp.userId) {
    await db.user.update({
      where: { id: emp.userId },
      data: { status: "SUSPENDED" },
    });
  }

  // Revoke active invitations
  await db.employeeInvitation.updateMany({
    where: { employeeId: emp.id, status: { in: ["SENT", "PENDING"] } },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  // Create immutable audit event
  await db.employeeAuditEvent.create({
    data: {
      workspaceId: emp.workspaceId,
      employeeId: emp.id,
      action: "EMPLOYEE_OFFBOARDED",
      actorName,
      detail: `Offboarded employee ${emp.fullName}. Tasks reassigned to ${reassignToEmployeeId ? "colleague" : "unassigned"}. Notes: ${notes || "None"}.`,
      beforeState: JSON.stringify({ status: emp.status }),
      afterState: JSON.stringify({ status: "OFFBOARDED", offboardedAt: new Date() }),
    },
  });

  return updated;
}

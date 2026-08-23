import { db } from "@/lib/db";
import { logEmployeeSecurityEvent } from "./employee-auth.service";

export type OnboardingBlocker = {
  id: string;
  category: "POLICY" | "ACCESS" | "WORK" | "SECURITY";
  title: string;
  description: string;
  actionText: string;
  actionType: "ACKNOWLEDGE_POLICY" | "REQUEST_ACCESS" | "CONTACT_MANAGER" | "VIEW_TASK";
  targetId?: string;
};

export type ContactPerson = {
  purpose: string;
  name: string;
  email?: string;
  roleTitle: string;
  employeeCode?: string;
};

/**
 * Baseline default policy templates seeded when an employee joins an organization.
 */
const DEFAULT_ORGANIZATION_POLICIES = [
  {
    policyCode: "SEC-POL-01",
    title: "Enterprise Information Security & Access Policy",
    category: "SECURITY",
    version: "1.0",
    isRequired: true,
    content:
      "All credentials, cryptographic keys, and internal communication channels must be handled with strict enterprise hygiene. 2FA is mandatory on all organizational portals. Exporting client datasets or source code outside verified perimeters is strictly forbidden.",
  },
  {
    policyCode: "DATA-PROT-01",
    title: "Client Data Protection & Confidentiality Agreement",
    category: "DATA_PROTECTION",
    version: "1.0",
    isRequired: true,
    content:
      "Client specifications, technical blueprints, commercial proposals, and source assets are privileged intellectual property. Access is granted strictly on a need-to-know basis per project allocation.",
  },
  {
    policyCode: "CODE-CONDUCT-01",
    title: "Engineering Delivery Standards & Professional Conduct",
    category: "CODE_OF_CONDUCT",
    version: "1.0",
    isRequired: true,
    content:
      "Commitment to high-fidelity architecture, clear communication, respect across multidisciplinary squads, and rapid escalation of blocking issues during delivery phases.",
  },
];

/**
 * Standard tool catalog for modern engineering organizations.
 */
const DEFAULT_TOOLS = [
  {
    toolKey: "BUSINESS_OS",
    toolName: "Business OS Core Node",
    category: "WORKSPACE",
    status: "CONNECTED",
  },
  {
    toolKey: "GITHUB",
    toolName: "GitHub Enterprise",
    category: "CODE",
    status: "PENDING",
  },
  {
    toolKey: "FIGMA",
    toolName: "Figma Workspace",
    category: "DESIGN",
    status: "PENDING",
  },
  {
    toolKey: "SLACK",
    toolName: "Slack Team Channels",
    category: "COMMUNICATION",
    status: "PENDING",
  },
  {
    toolKey: "GOOGLE_WORKSPACE",
    toolName: "Google Workspace & Drive",
    category: "WORKSPACE",
    status: "PENDING",
  },
];

/**
 * Ensures standard organization baseline policies, tools, and onboarding state exist for an employee.
 */
export async function ensureEmployeeOnboardingBaselines(workspaceId: string, employeeId: string) {
  // 1. Ensure Onboarding State record exists
  let onboardingState = await db.employeeOnboardingState.findUnique({
    where: { employeeId },
  });

  if (!onboardingState) {
    onboardingState = await db.employeeOnboardingState.create({
      data: {
        employeeId,
        status: "IN_PROGRESS",
        readinessScore: 25,
      },
    });
  }

  // 2. Ensure baseline policies exist
  const existingPolicies = await db.employeePolicyAcknowledgement.findMany({
    where: { employeeId },
  });

  if (existingPolicies.length === 0) {
    await db.employeePolicyAcknowledgement.createMany({
      data: DEFAULT_ORGANIZATION_POLICIES.map((p) => ({
        workspaceId,
        employeeId,
        policyCode: p.policyCode,
        title: p.title,
        category: p.category,
        version: p.version,
        isRequired: p.isRequired,
        content: p.content,
      })),
    });
  }

  // 3. Ensure baseline tools exist
  const existingTools = await db.employeeToolAccess.findMany({
    where: { employeeId },
  });

  if (existingTools.length === 0) {
    await db.employeeToolAccess.createMany({
      data: DEFAULT_TOOLS.map((t) => ({
        workspaceId,
        employeeId,
        toolKey: t.toolKey,
        toolName: t.toolName,
        category: t.category,
        status: t.status,
      })),
    });
  }

  return onboardingState;
}

/**
 * Deep, real-time Employee Activation and Work Context Resolver.
 * Computes live readiness, blocker list, next best action, and people graph.
 */
export async function getEmployeeActivationContext(employeeId: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      workspace: {
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      role: true,
      team: {
        include: {
          teamLead: {
            select: { id: true, fullName: true, employeeCode: true, email: true },
          },
          members: {
            select: { id: true, fullName: true, employeeCode: true, avatar: true, department: true },
            take: 10,
          },
        },
      },
      user: {
        select: { id: true, email: true, emailVerified: true, status: true, role: true, lastLoginAt: true },
      },
      projectAllocations: {
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true, industry: true } },
              deliverables: { take: 5 },
            },
          },
        },
      },
      policyAcknowledgements: {
        orderBy: { isRequired: "desc" },
      },
      toolAccesses: {
        orderBy: { createdAt: "asc" },
      },
      onboardingState: true,
    },
  });

  if (!employee) return null;

  // Ensure baseline policies and tools if missing
  if (!employee.onboardingState || employee.policyAcknowledgements.length === 0) {
    await ensureEmployeeOnboardingBaselines(employee.workspaceId, employee.id);
    return getEmployeeActivationContext(employeeId);
  }

  // Retrieve assigned client tasks
  const assignedTasks = await db.clientTask.findMany({
    where: {
      assigneeId: employee.id,
      client: { workspaceId: employee.workspaceId },
    },
    include: {
      deliverable: { select: { id: true, title: true, status: true } },
      project: { select: { id: true, name: true, code: true } },
      acceptanceCriteria: true,
      evidenceRecords: true,
    },
    orderBy: [
      { priority: "desc" },
      { dueAt: "asc" },
    ],
  });

  // Calculate Next Best Action
  let nextBestAction: any = null;
  const actionableTasks = assignedTasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  if (actionableTasks.length > 0) {
    // Pick highest priority or in-progress task
    const inProgressTask = actionableTasks.find((t) => t.status === "IN_PROGRESS");
    const topTask = inProgressTask || actionableTasks[0];
    nextBestAction = {
      taskId: topTask.id,
      taskCode: topTask.code,
      title: topTask.title,
      description: topTask.description || "Execute planned operational task in accordance with project specifications.",
      status: topTask.status,
      priority: topTask.priority,
      projectName: topTask.project?.name || "General Project",
      projectCode: topTask.project?.code || "PROJ",
      deliverableTitle: topTask.deliverable?.title || null,
      dueAt: topTask.dueAt,
      whyItMatters:
        topTask.priority === "URGENT" || topTask.priority === "HIGH"
          ? "Critical milestone deliverable with high dependency on upcoming client signoff."
          : "Active workflow item assigned directly to your squad.",
    };
  }

  // Parse permissions
  let rolePermissions = { can: [] as string[], cannot: [] as string[] };
  if (employee.role?.permissionTemplate) {
    try {
      const parsed = JSON.parse(employee.role.permissionTemplate);
      rolePermissions.can = Array.isArray(parsed.can) ? parsed.can : [];
      rolePermissions.cannot = Array.isArray(parsed.cannot) ? parsed.cannot : [];
    } catch {
      // Fallback standard permissions
    }
  }

  if (rolePermissions.can.length === 0) {
    rolePermissions.can = [
      "Access Assigned Projects & Technical Specifications",
      "Create, update, and progress assigned tasks",
      "Attach deliverable verification evidence",
      "Review client requirement context for assigned projects",
      "Participate in team operational discussions",
    ];
  }
  if (rolePermissions.cannot.length === 0) {
    rolePermissions.cannot = [
      "Modify organization-wide billing and commercial rates",
      "Delete client projects or legal contracts",
      "Manage organization employee roles and payroll",
      "Export client data outside authorized workspace",
    ];
  }

  // Calculate Real Blockers
  const blockers: OnboardingBlocker[] = [];

  // 1. Policy blockers
  const unacknowledgedRequiredPolicies = employee.policyAcknowledgements.filter(
    (p) => p.isRequired && !p.acknowledgedAt,
  );
  if (unacknowledgedRequiredPolicies.length > 0) {
    blockers.push({
      id: "BLOCKER-POLICIES",
      category: "POLICY",
      title: `${unacknowledgedRequiredPolicies.length} Required Compliance Policy Acknowledgement(s) Pending`,
      description: `Before beginning active production work, you must review and acknowledge: ${unacknowledgedRequiredPolicies.map((p) => p.title).join(", ")}.`,
      actionText: "Review & Acknowledge Policies",
      actionType: "ACKNOWLEDGE_POLICY",
      targetId: unacknowledgedRequiredPolicies[0].id,
    });
  }

  // 2. Work blockers
  if (assignedTasks.length === 0 && employee.projectAllocations.length === 0) {
    blockers.push({
      id: "BLOCKER-WORK-ASSIGNMENT",
      category: "WORK",
      title: "Work Allocation Awaiting Manager Assignment",
      description: "No active projects or initial tasks have been assigned to your profile yet. Your manager or squad lead will assign your first sprint backlog.",
      actionText: "Contact Squad Lead",
      actionType: "CONTACT_MANAGER",
    });
  }

  // Calculate Readiness Breakdown
  const accountReady = employee.user?.status === "ACTIVE" && employee.status === "ACTIVE";
  const roleReady = Boolean(employee.roleId && employee.primaryResponsibility);
  const policiesReady = unacknowledgedRequiredPolicies.length === 0;
  const toolsConfiguredCount = employee.toolAccesses.filter((t) => t.status === "CONNECTED").length;
  const workReady = assignedTasks.length > 0 || employee.projectAllocations.length > 0;

  // Calculate overall Readiness Score (0 - 100)
  let score = 0;
  if (accountReady) score += 20;
  if (roleReady) score += 20;
  if (employee.onboardingState?.identityReviewedAt) score += 15;
  if (policiesReady) score += 25;
  if (workReady) score += 20;

  // Determine overall status
  let overallStatus: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "READY" | "COMPLETED" = "IN_PROGRESS";
  if (employee.onboardingState?.status === "COMPLETED") {
    overallStatus = "COMPLETED";
    score = 100;
  } else if (blockers.length > 0) {
    overallStatus = "BLOCKED";
  } else if (policiesReady && accountReady && (workReady || roleReady)) {
    overallStatus = "READY";
  }

  // People Graph
  const managerObj: any = employee.team?.teamLead || employee.workspace.owner;
  const managerName = managerObj?.fullName || managerObj?.name || "Workspace Admin";
  const managerEmail = managerObj?.email || undefined;
  const managerEmployeeCode = managerObj?.employeeCode || undefined;

  const peopleGraph: ContactPerson[] = [
    {
      purpose: "General Guidance & Squad Allocation",
      name: managerName,
      email: managerEmail,
      roleTitle: employee.team?.teamLead ? "Team Lead" : "Organization Owner",
      employeeCode: managerEmployeeCode,
    },
    {
      purpose: "Technical Architecture & Code Reviews",
      name: employee.team?.name ? `${employee.team.name} Tech Lead` : "Engineering Lead",
      roleTitle: "Lead Architect",
    },
    {
      purpose: "Design & UX Specifications",
      name: "Product Design Squad",
      roleTitle: "Design System Lead",
    },
  ];

  // Assigned Projects mapped with "Why You Are Here"
  const projects = employee.projectAllocations.map((alloc) => {
    const p = alloc.project;
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      stage: p.stage,
      clientName: p.client?.companyName || "Enterprise Client",
      clientIndustry: p.client?.industry || "Technology",
      projectRole: alloc.projectRole,
      workstream: alloc.workstream || "ENGINEERING",
      allocationPercentage: alloc.allocationPercentage,
      joinedAt: alloc.joinedAt,
      whyYouAreHere: `You are assigned to the ${alloc.workstream || "ENGINEERING"} workstream as ${alloc.projectRole} to lead delivery and ensure quality standards.`,
      deliverablesCount: p.deliverables?.length || 0,
    };
  });

  return {
    identity: {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      preferredName: employee.preferredName,
      email: employee.email,
      phone: employee.phone,
      avatar: employee.avatar,
      department: employee.department,
      location: employee.location || "Remote / Distributed",
      timezone: employee.timezone,
      employmentType: employee.employmentType,
      joinedAt: employee.joinedAt,
      status: employee.status,
    },
    organization: {
      id: employee.workspace.id,
      name: employee.workspace.companyName,
      ownerName: employee.workspace.owner?.name || "Workspace Admin",
    },
    role: {
      id: employee.role?.id || null,
      name: employee.role?.name || "Team Member",
      code: employee.role?.code || "ROLE-MEMBER",
      department: employee.role?.department || employee.department,
      purpose: employee.role?.purpose || "Execute high-impact operational delivery across organizational workstreams.",
      primaryResponsibility: employee.primaryResponsibility || "Executing assigned project milestones and tasks.",
      secondaryResponsibilities: employee.secondaryResponsibilities
        ? JSON.parse(employee.secondaryResponsibilities)
        : [],
      accountabilities: employee.accountabilities ? JSON.parse(employee.accountabilities) : [],
      capabilities: employee.capabilities ? JSON.parse(employee.capabilities) : [],
    },
    team: {
      id: employee.team?.id || null,
      name: employee.team?.name || "Core Squad",
      code: employee.team?.code || "TEAM-CORE",
      department: employee.team?.department || employee.department,
      description: employee.team?.description || "High-velocity product delivery squad.",
      lead: employee.team?.teamLead
        ? {
            id: employee.team.teamLead.id,
            name: employee.team.teamLead.fullName,
            employeeCode: employee.team.teamLead.employeeCode,
            email: employee.team.teamLead.email,
          }
        : null,
      members: (employee.team?.members || []).map((m) => ({
        id: m.id,
        name: m.fullName,
        code: m.employeeCode,
        avatar: m.avatar,
        department: m.department,
      })),
    },
    manager: {
      name: managerName,
      email: managerEmail,
      role: employee.team?.teamLead ? "Team Lead" : "Workspace Owner",
    },
    readiness: {
      score,
      status: overallStatus,
      accountReady,
      roleReady,
      policiesReady,
      toolsConfiguredCount,
      totalToolsCount: employee.toolAccesses.length,
      workReady,
      blockers,
    },
    permissions: rolePermissions,
    peopleGraph,
    projects,
    tasks: assignedTasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      layer: t.layer,
      dueAt: t.dueAt,
      projectId: t.projectId,
      projectName: t.project?.name || "General",
      deliverableId: t.deliverableId,
      deliverableTitle: t.deliverable?.title,
      criteriaCount: t.acceptanceCriteria.length,
      evidenceCount: t.evidenceRecords.length,
    })),
    nextBestAction,
    policies: employee.policyAcknowledgements.map((p) => ({
      id: p.id,
      policyCode: p.policyCode,
      title: p.title,
      category: p.category,
      version: p.version,
      isRequired: p.isRequired,
      content: p.content,
      isAcknowledged: Boolean(p.acknowledgedAt),
      acknowledgedAt: p.acknowledgedAt,
    })),
    tools: employee.toolAccesses.map((t) => ({
      id: t.id,
      toolKey: t.toolKey,
      toolName: t.toolName,
      category: t.category,
      status: t.status,
      accountIdentifier: t.accountIdentifier,
      requestedAt: t.requestedAt,
      grantedAt: t.grantedAt,
    })),
    onboardingState: {
      id: employee.onboardingState?.id,
      status: employee.onboardingState?.status || "IN_PROGRESS",
      identityReviewedAt: employee.onboardingState?.identityReviewedAt,
      roleReviewedAt: employee.onboardingState?.roleReviewedAt,
      accessReviewedAt: employee.onboardingState?.accessReviewedAt,
      completedAt: employee.onboardingState?.completedAt,
    },
  };
}

/**
 * Acknowledge an organizational policy with immutable audit trail.
 */
export async function acknowledgeEmployeePolicy(params: {
  employeeId: string;
  policyId: string;
  ip?: string;
  actorName?: string;
}) {
  const policy = await db.employeePolicyAcknowledgement.findUnique({
    where: { id: params.policyId },
    include: { employee: true },
  });

  if (!policy || policy.employeeId !== params.employeeId) {
    return { ok: false, message: "Policy record not found for this employee." };
  }

  const updated = await db.employeePolicyAcknowledgement.update({
    where: { id: params.policyId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedIp: params.ip || "127.0.0.1",
    },
  });

  await logEmployeeSecurityEvent({
    workspaceId: policy.workspaceId,
    employeeId: policy.employeeId,
    action: "POLICY_ACKNOWLEDGED",
    actorName: params.actorName || policy.employee.fullName,
    detail: `Acknowledged policy "${policy.title}" (${policy.policyCode} v${policy.version}).`,
    afterState: { policyId: policy.id, policyCode: policy.policyCode, version: policy.version },
  });

  return { ok: true, policy: updated };
}

/**
 * Request access for a specific development or organization tool.
 */
export async function requestEmployeeToolAccess(params: {
  employeeId: string;
  toolId: string;
  accountIdentifier?: string;
  actorName?: string;
}) {
  const tool = await db.employeeToolAccess.findUnique({
    where: { id: params.toolId },
    include: { employee: true },
  });

  if (!tool || tool.employeeId !== params.employeeId) {
    return { ok: false, message: "Tool record not found for this employee." };
  }

  const updated = await db.employeeToolAccess.update({
    where: { id: params.toolId },
    data: {
      status: "ACCESS_REQUESTED",
      accountIdentifier: params.accountIdentifier?.trim() || null,
      requestedAt: new Date(),
    },
  });

  await logEmployeeSecurityEvent({
    workspaceId: tool.workspaceId,
    employeeId: tool.employeeId,
    action: "TOOL_ACCESS_REQUESTED",
    actorName: params.actorName || tool.employee.fullName,
    detail: `Requested access for tool "${tool.toolName}" (${tool.toolKey}).`,
    afterState: { toolId: tool.id, toolKey: tool.toolKey, account: params.accountIdentifier },
  });

  return { ok: true, tool: updated };
}

/**
 * Record section review timestamps during onboarding (Identity, Role, Permissions).
 */
export async function recordOnboardingSectionReview(params: {
  employeeId: string;
  section: "IDENTITY" | "ROLE" | "ACCESS";
}) {
  const dataToUpdate: any = {};
  if (params.section === "IDENTITY") dataToUpdate.identityReviewedAt = new Date();
  if (params.section === "ROLE") dataToUpdate.roleReviewedAt = new Date();
  if (params.section === "ACCESS") dataToUpdate.accessReviewedAt = new Date();

  const updated = await db.employeeOnboardingState.upsert({
    where: { employeeId: params.employeeId },
    create: {
      employeeId: params.employeeId,
      status: "IN_PROGRESS",
      ...dataToUpdate,
    },
    update: dataToUpdate,
  });

  return { ok: true, state: updated };
}

/**
 * Transition Employee Onboarding to COMPLETED.
 * Requires all mandatory policies to be acknowledged.
 */
export async function completeEmployeeOnboarding(params: {
  employeeId: string;
  actorName?: string;
}) {
  const unacknowledged = await db.employeePolicyAcknowledgement.findMany({
    where: {
      employeeId: params.employeeId,
      isRequired: true,
      acknowledgedAt: null,
    },
  });

  if (unacknowledged.length > 0) {
    return {
      ok: false,
      message: `Cannot complete onboarding. ${unacknowledged.length} mandatory policy acknowledgement(s) are pending.`,
    };
  }

  const employee = await db.employee.findUnique({
    where: { id: params.employeeId },
  });

  if (!employee) {
    return { ok: false, message: "Employee not found." };
  }

  const updatedState = await db.employeeOnboardingState.upsert({
    where: { employeeId: params.employeeId },
    create: {
      employeeId: params.employeeId,
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: params.actorName || employee.fullName,
      readinessScore: 100,
    },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: params.actorName || employee.fullName,
      readinessScore: 100,
    },
  });

  // Also update employee activatedAt and status
  await db.employee.update({
    where: { id: params.employeeId },
    data: {
      status: "ACTIVE",
      activatedAt: employee.activatedAt || new Date(),
    },
  });

  await logEmployeeSecurityEvent({
    workspaceId: employee.workspaceId,
    employeeId: employee.id,
    action: "ONBOARDING_COMPLETED",
    actorName: params.actorName || employee.fullName,
    detail: `Employee ${employee.fullName} successfully completed operational onboarding.`,
    afterState: { onboardingStatus: "COMPLETED", completedAt: new Date() },
  });

  return { ok: true, state: updatedState };
}

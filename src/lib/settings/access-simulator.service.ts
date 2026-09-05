import { db } from "@/lib/db";

export interface AccessSimulationInput {
  workspaceId: string;
  employeeId?: string;
  userId?: string;
  module: string; // "PAYMENTS" | "SECURITY" | "TASKS" | "PROJECTS" | "SETTINGS" | "INTEGRATIONS" | "CLIENT_PORTAL"
  action: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "APPROVE" | "MANAGE";
  projectId?: string;
}

export interface AccessSimulationResult {
  decision: "ALLOWED" | "DENIED";
  principal: {
    name: string;
    email: string;
    roleName: string;
    isOwner: boolean;
  };
  context: {
    module: string;
    action: string;
    projectName?: string;
  };
  reason: string;
  permissionTrace: {
    step: string;
    result: "PASS" | "FAIL" | "NEUTRAL";
    detail: string;
  }[];
  evaluatedAt: string;
}

/**
 * Access Simulator — determines whether a principal can execute a target action
 * on a module or project WITHOUT executing the action.
 */
export async function simulateAccess(
  input: AccessSimulationInput
): Promise<AccessSimulationResult> {
  const { workspaceId, employeeId, userId, module, action, projectId } = input;

  let employee = employeeId
    ? await db.employee.findUnique({
        where: { id: employeeId },
        include: { role: true, team: true, projectAllocations: { include: { project: true } } },
      })
    : null;

  let user = userId
    ? await db.user.findUnique({ where: { id: userId } })
    : null;

  if (!employee && user) {
    // Try to find employee linked to user
    employee = await db.employee.findFirst({
      where: { userId: user.id },
      include: { role: true, team: true, projectAllocations: { include: { project: true } } },
    });
  }

  // Check if principal is Owner of workspace
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: true },
  });

  const isOwner =
    (user && workspace?.ownerId === user.id) ||
    (employee && workspace?.ownerId === employee.userId);

  const principalName = employee?.fullName || user?.name || "Workspace Member";
  const principalEmail = employee?.email || user?.email || "unknown@workspace.local";
  const roleName = isOwner
    ? "Workspace Owner"
    : employee?.role?.name || user?.role || "Member";

  const permissionTrace: {
    step: string;
    result: "PASS" | "FAIL" | "NEUTRAL";
    detail: string;
  }[] = [];

  let decision: "ALLOWED" | "DENIED" = "DENIED";
  let reason = "";

  // 1. Check Owner Bypass
  if (isOwner) {
    permissionTrace.push({
      step: "Owner Superuser Evaluation",
      result: "PASS",
      detail: "Principal is the authoritative Workspace Owner with unrestricted governance privileges.",
    });
    return {
      decision: "ALLOWED",
      principal: { name: principalName, email: principalEmail, roleName, isOwner: true },
      context: { module, action, projectName: projectId ? "Assigned Project" : undefined },
      reason: "Allowed: Workspace Owner has root permissions across all system modules.",
      permissionTrace,
      evaluatedAt: new Date().toISOString(),
    };
  }

  permissionTrace.push({
    step: "Owner Superuser Evaluation",
    result: "NEUTRAL",
    detail: "Principal is not the Workspace Owner; proceeding to role-based access matrix.",
  });

  // 2. Sensitive Administrative Modules (SECURITY, SETTINGS, PAYMENTS)
  const isHighPrivilegeModule = ["SECURITY", "SETTINGS", "PAYMENTS", "BILLING"].includes(
    module.toUpperCase()
  );

  const roleNameLower = (roleName || "").toLowerCase();
  const hasAdminRole =
    roleNameLower.includes("admin") ||
    roleNameLower.includes("lead") ||
    roleNameLower.includes("director");

  if (isHighPrivilegeModule) {
    if (!hasAdminRole) {
      permissionTrace.push({
        step: "Administrative Module Gate",
        result: "FAIL",
        detail: `Module '${module}' requires administrative clearance. Role '${roleName}' does not possess administrative scope.`,
      });
      decision = "DENIED";
      reason = `Denied: Principal role '${roleName}' does not grant administrative privileges for ${module}.`;
      return {
        decision,
        principal: { name: principalName, email: principalEmail, roleName, isOwner: false },
        context: { module, action },
        reason,
        permissionTrace,
        evaluatedAt: new Date().toISOString(),
      };
    } else {
      permissionTrace.push({
        step: "Administrative Module Gate",
        result: "PASS",
        detail: `Role '${roleName}' possesses administrative clearance for module '${module}'.`,
      });
    }
  }

  // 3. Project Scoping
  if (projectId) {
    const allocation = employee?.projectAllocations.find(
      (a) => a.projectId === projectId && a.status === "ACTIVE"
    );

    if (!allocation && !hasAdminRole) {
      permissionTrace.push({
        step: "Project Membership Verification",
        result: "FAIL",
        detail: `Principal is not actively assigned to project '${projectId}'.`,
      });
      return {
        decision: "DENIED",
        principal: { name: principalName, email: principalEmail, roleName, isOwner: false },
        context: { module, action, projectName: projectId },
        reason: "Denied: Project membership or allocation is required to perform actions on this project.",
        permissionTrace,
        evaluatedAt: new Date().toISOString(),
      };
    } else {
      permissionTrace.push({
        step: "Project Membership Verification",
        result: "PASS",
        detail: allocation
          ? `Principal is assigned to project as '${allocation.projectRole}' (${allocation.teamName} team).`
          : "Principal has workspace-wide administrative project access.",
      });
    }
  }

  // 4. Action Specific Evaluation
  if (action === "DELETE" && !hasAdminRole) {
    permissionTrace.push({
      step: "Destructive Action Guard",
      result: "FAIL",
      detail: `Action 'DELETE' on '${module}' requires elevated Admin privileges.`,
    });
    decision = "DENIED";
    reason = `Denied: Deleting resources in ${module} requires Admin privileges.`;
  } else if (action === "APPROVE" && !hasAdminRole && !roleNameLower.includes("qa")) {
    permissionTrace.push({
      step: "Approval Authority Evaluation",
      result: "FAIL",
      detail: `Action 'APPROVE' requires QA or Lead verification role.`,
    });
    decision = "DENIED";
    reason = `Denied: Role '${roleName}' does not hold sign-off or QA verification authority.`;
  } else {
    permissionTrace.push({
      step: "Standard Operation Evaluation",
      result: "PASS",
      detail: `Role '${roleName}' is authorized for '${action}' operations on '${module}'.`,
    });
    decision = "ALLOWED";
    reason = `Allowed: Principal is authorized to perform '${action}' on '${module}'.`;
  }

  return {
    decision,
    principal: { name: principalName, email: principalEmail, roleName, isOwner: false },
    context: { module, action },
    reason,
    permissionTrace,
    evaluatedAt: new Date().toISOString(),
  };
}

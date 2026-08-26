import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export interface EmployeePermissionsSummary {
  can: string[];
  cannot: string[];
}

export interface EmployeeRoleCapabilities {
  department: string;
  roleName: string;
  roleCode: string;
  workstreams: string[];
  primaryModules: string[];
  permissions: EmployeePermissionsSummary;
}

/**
 * Role-aware capability templates derived from real organizational roles & departments.
 */
export function deriveRoleCapabilities(
  roleName: string = "Specialist",
  department: string = "ENGINEERING",
  customPermissionsRaw?: string,
): EmployeeRoleCapabilities {
  const normName = roleName.toLowerCase();
  const normDept = department.toUpperCase();

  let workstreams = ["DEVELOPMENT", "TASKS"];
  let primaryModules = ["Projects", "Tasks", "Deliverables", "Team"];
  let can = [
    "View assigned projects & blueprints",
    "Update assigned task statuses & evidence",
    "Submit deliverables for review",
    "Collaborate on project comments",
  ];
  const cannot = [
    "Manage organization settings & billing",
    "Invite or remove team members",
    "Modify system roles or permission templates",
    "Approve client contract pricing",
  ];

  if (normName.includes("frontend") || normDept === "ENGINEERING") {
    workstreams = ["FRONTEND", "UI_COMPONENTS", "CLIENT_REVIEW"];
    primaryModules = ["Projects", "Frontend Tasks", "Design Handoffs", "Requirements", "Client Review", "Deployments"];
    can = [
      "Access frontend capabilities & API contracts",
      "Create and update frontend task progress",
      "Attach UI evidence and preview deployments",
      "Inspect client requirement specifications",
    ];
  } else if (normName.includes("backend") || normName.includes("api")) {
    workstreams = ["BACKEND", "DATABASE", "API_INTEGRATION"];
    primaryModules = ["Projects", "Backend Tasks", "API Requirements", "Database Work", "Integrations", "Deployments"];
    can = [
      "Access backend API blueprints and data schemas",
      "Update service logic and migration tasks",
      "Document API endpoints and integration contracts",
      "Review technical architecture dependencies",
    ];
  } else if (normName.includes("design") || normDept === "DESIGN") {
    workstreams = ["DESIGN", "PROTOTYPES", "DESIGN_SYSTEM"];
    primaryModules = ["Projects", "Design Tasks", "Requirements", "Client Feedback", "Deliverables"];
    can = [
      "View client discovery notes and requirements",
      "Upload design prototypes and deliverable specs",
      "Review client design feedback & change requests",
      "Collaborate on design system tokens",
    ];
  } else if (normName.includes("qa") || normName.includes("test") || normDept === "QA") {
    workstreams = ["TESTING", "BUG_REPORTS", "VERIFICATION"];
    primaryModules = ["Testing", "Tasks", "Requirements", "Bug Reports", "Client Review"];
    can = [
      "Execute test specifications & acceptance criteria",
      "Log verified bug reports and regressions",
      "Sign off on milestone quality gates",
      "Verify client deliverable readiness",
    ];
  } else if (normName.includes("manager") || normName.includes("lead") || normName.includes("director")) {
    workstreams = ["PLANNING", "SPRINT", "DELIVERY", "COORDINATION"];
    primaryModules = ["Projects", "Team", "Tasks", "Milestones", "Client Review", "Delivery"];
    can = [
      "Coordinate project milestones & task assignments",
      "Review and approve team deliverables",
      "Monitor team capacity & delivery velocity",
      "Communicate progress on client requirements",
    ];
  }

  // Parse custom overrides if present
  if (customPermissionsRaw) {
    try {
      const parsed = JSON.parse(customPermissionsRaw);
      if (Array.isArray(parsed.can)) can = parsed.can;
    } catch {
      // Ignore json parse error
    }
  }

  return {
    department: normDept,
    roleName,
    roleCode: normName.replace(/\s+/g, "_").toUpperCase(),
    workstreams,
    primaryModules,
    permissions: {
      can,
      cannot,
    },
  };
}

/**
 * Log an immutable security & employee event.
 */
export async function logEmployeeSecurityEvent({
  workspaceId,
  employeeId,
  action,
  actorName = "System",
  actorId,
  detail,
  beforeState,
  afterState,
}: {
  workspaceId: string;
  employeeId?: string | null;
  action: string;
  actorName?: string;
  actorId?: string;
  detail?: string;
  beforeState?: any;
  afterState?: any;
}) {
  try {
    await db.employeeAuditEvent.create({
      data: {
        workspaceId,
        employeeId: employeeId ?? null,
        action,
        actorId: actorId ?? null,
        actorName,
        detail: detail ?? null,
        beforeState: beforeState ? JSON.stringify(beforeState) : "{}",
        afterState: afterState ? JSON.stringify(afterState) : "{}",
      },
    });
  } catch (err) {
    console.error("[EmployeeSecurityEvent] Failed to record audit event:", err);
  }
}

/**
 * Resolves full authentic operating context for an employee.
 */
export async function resolveEmployeeContext(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      role: true,
      status: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return { isEmployee: false, reason: "USER_NOT_FOUND" };
  }

  // Find linked employee record or fallback to email match in workspaces
  let employee = await db.employee.findFirst({
    where: {
      OR: [
        { userId: user.id },
        { email: user.email.toLowerCase() },
      ],
    },
    include: {
      workspace: {
        select: {
          id: true,
          companyName: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      role: true,
      team: {
        include: {
          teamLead: { select: { id: true, fullName: true, email: true } },
        },
      },
      projectAllocations: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              stage: true,
              health: true,
              progress: true,
              managerName: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    // If user is OWNER or ADMIN without an explicit employee profile
    return {
      isEmployee: false,
      user,
      isOwnerOrAdmin: user.role === "OWNER" || user.role === "ADMIN",
    };
  }

  // Ensure Employee is linked to this user id if not already
  if (!employee.userId) {
    await db.employee.update({
      where: { id: employee.id },
      data: { userId: user.id, status: "ACTIVE" },
    });
  }

  // Retrieve inviter metadata from latest invitation
  const latestInvitation = await db.employeeInvitation.findFirst({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    select: {
      invitedByName: true,
      createdAt: true,
      status: true,
    },
  });

  const inviterName =
    latestInvitation?.invitedByName ||
    employee.workspace.owner.name ||
    "Workspace Administrator";

  const capabilities = deriveRoleCapabilities(
    employee.role?.name || "Team Member",
    employee.department || "ENGINEERING",
    employee.customPermissions,
  );

  // Check if employee has multiple workspaces
  const allMemberships = await db.employee.findMany({
    where: { email: user.email.toLowerCase() },
    include: {
      workspace: { select: { id: true, companyName: true } },
      role: { select: { name: true } },
    },
  });

  const organizations = allMemberships.map((m) => ({
    workspaceId: m.workspace.id,
    workspaceName: m.workspace.companyName,
    role: m.role?.name || "Member",
    isCurrent: m.workspaceId === employee.workspaceId,
  }));

  return {
    isEmployee: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email,
      status: employee.status,
      department: employee.department,
      timezone: employee.timezone,
      location: employee.location,
      primaryResponsibility: employee.primaryResponsibility,
      capacityTargetHours: employee.capacityTargetHours,
      activatedAt: employee.activatedAt,
    },
    organization: {
      id: employee.workspace.id,
      name: employee.workspace.companyName,
      owner: employee.workspace.owner,
    },
    role: employee.role
      ? {
          id: employee.role.id,
          name: employee.role.name,
          code: employee.role.code,
          department: employee.role.department,
          purpose: employee.role.purpose,
        }
      : {
          id: "default",
          name: "Team Member",
          code: "MEMBER",
          department: employee.department,
          purpose: "Execution and engineering delivery",
        },
    team: employee.team
      ? {
          id: employee.team.id,
          name: employee.team.name,
          code: employee.team.code,
          department: employee.team.department,
          lead: employee.team.teamLead?.fullName || inviterName,
        }
      : {
          id: "default",
          name: "General Delivery",
          code: "GENERAL",
          department: employee.department,
          lead: inviterName,
        },
    inviter: {
      name: inviterName,
      invitedAt: latestInvitation?.createdAt || employee.joinedAt,
    },
    capabilities,
    allocations: employee.projectAllocations.map((a) => ({
      projectId: a.project.id,
      projectName: a.project.name,
      projectCode: a.project.code,
      stage: a.project.stage,
      health: a.project.health,
      progress: a.project.progress,
      managerName: a.project.managerName,
      projectRole: a.projectRole,
      allocationPercentage: a.allocationPercentage,
    })),
    organizations,
  };
}

/**
 * Loads real operational work for the employee workspace.
 */
export async function getEmployeeWorkData(employeeId: string, workspaceId: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      team: true,
      role: true,
      workspace: true,
      projectAllocations: {
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true } },
              deliverables: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Get project IDs allocated to this employee
  const allocatedProjectIds = employee.projectAllocations.map((a) => a.projectId);

  // Fetch tasks matching this employee:
  // 1. Directly assigned by assigneeId or assigneeName
  // 2. Or belonging to allocated projects
  const tasks = await db.clientTask.findMany({
    where: {
      OR: [
        { assigneeId: employee.id },
        { assigneeId: employee.userId ?? undefined },
        { assigneeName: employee.fullName },
        { projectId: { in: allocatedProjectIds.length > 0 ? allocatedProjectIds : ["__none__"] } },
      ],
    },
    include: {
      project: { select: { id: true, name: true, code: true, stage: true, health: true } },
      client: { select: { id: true, companyName: true } },
      deliverable: { select: { id: true, title: true, status: true, category: true, acceptanceCriteria: true } },
      subtasks: { orderBy: { order: "asc" } },
      acceptanceCriteria: { orderBy: { order: "asc" } },
      dependencies: {
        include: {
          dependsOnTask: { select: { id: true, code: true, title: true, status: true, assigneeName: true } },
        },
      },
      dependentOnMe: {
        include: {
          task: { select: { id: true, code: true, title: true, status: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOf3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const dueTodayTasks: typeof tasks = [];
  const inProgressTasks: typeof tasks = [];
  const dueSoonTasks: typeof tasks = [];
  const blockedTasks: typeof tasks = [];
  const inReviewTasks: typeof tasks = [];
  const upcomingTasks: typeof tasks = [];
  const completedTasks: typeof tasks = [];

  for (const t of tasks) {
    const isDone = t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED";
    const isDueTodayOrOverdue = t.dueAt && t.dueAt <= endOfToday && !isDone;
    const isDueSoon = t.dueAt && t.dueAt > endOfToday && t.dueAt <= endOf3Days && !isDone;

    if (isDone) {
      completedTasks.push(t);
    } else if (t.status === "BLOCKED") {
      blockedTasks.push(t);
    } else if (isDueTodayOrOverdue) {
      dueTodayTasks.push(t);
    } else if (t.status === "IN_PROGRESS") {
      inProgressTasks.push(t);
    } else if (t.status === "IN_REVIEW" || t.status === "CLIENT_REVIEW" || t.status === "READY_FOR_CLIENT" || t.status === "CHANGES_REQUESTED") {
      inReviewTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }

    if (isDueSoon) {
      dueSoonTasks.push(t);
    }
  }

  // Fetch team members in the same team or workspace
  const teamMembers = await db.employee.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      ...(employee.teamId ? { teamId: employee.teamId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      department: true,
      role: { select: { name: true } },
      lastActiveAt: true,
    },
    take: 12,
  });

  // Fetch deliverables across assigned projects
  const deliverables = await db.projectDeliverable.findMany({
    where: {
      projectId: { in: allocatedProjectIds.length > 0 ? allocatedProjectIds : ["__none__"] },
    },
    include: {
      project: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Recent audit activity for this employee
  const recentActivities = await db.employeeAuditEvent.findMany({
    where: {
      workspaceId,
      OR: [
        { employeeId: employee.id },
        { actorName: employee.fullName },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    metrics: {
      totalAssignedTasks: tasks.filter((t) => t.status !== "DONE" && t.status !== "COMPLETED" && t.status !== "CANCELLED").length,
      todayCount: dueTodayTasks.length,
      inProgressCount: inProgressTasks.length,
      dueSoonCount: dueSoonTasks.length,
      blockedCount: blockedTasks.length,
      inReviewCount: inReviewTasks.length,
      completedCount: completedTasks.length,
      projectsCount: employee.projectAllocations.length,
    },
    sections: {
      all: tasks,
      dueToday: dueTodayTasks,
      inProgress: inProgressTasks,
      dueSoon: dueSoonTasks,
      blocked: blockedTasks,
      inReview: inReviewTasks,
      upcoming: upcomingTasks,
      completed: completedTasks,
    },
    projects: employee.projectAllocations.map((a) => ({
      id: a.project.id,
      name: a.project.name,
      code: a.project.code,
      stage: a.project.stage,
      health: a.project.health,
      progress: a.project.progress,
      clientName: a.project.client.companyName,
      role: a.projectRole,
      allocation: a.allocationPercentage,
    })),
    deliverables: deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      projectName: d.project.name,
      status: d.status,
      category: d.category,
      submittedAt: d.submittedAt,
    })),
    teamMembers: teamMembers.map((m) => ({
      id: m.id,
      name: m.fullName,
      role: m.role?.name || "Specialist",
      department: m.department,
      isCurrentUser: m.id === employee.id,
      lastActiveAt: m.lastActiveAt,
    })),
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      createdAt: a.createdAt,
    })),
  };
}

/**
 * Mask an email for secure OTP feedback (e.g. j••••••@company.com).
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  if (user.length <= 2) return `${user[0]}•@${domain}`;
  return `${user[0]}${"•".repeat(Math.min(user.length - 2, 6))}${user[user.length - 1]}@${domain}`;
}

/**
 * Dispatches a 6-digit OTP code for employee password recovery.
 */
export async function requestEmployeeRecoveryOtp(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  // Rate limit by email
  const rl = await rateLimit(3, 60_000, `emp-otp-${cleanEmail}`);
  if (!rl.ok) {
    return {
      ok: false,
      error: "TOO_MANY_ATTEMPTS",
      message: "Too many verification requests. Please wait a minute.",
    };
  }

  const user = await db.user.findUnique({
    where: { email: cleanEmail },
    include: {
      employee: {
        include: { workspace: true },
      },
    },
  });

  // Generic success to prevent account enumeration if user does not exist
  if (!user) {
    return {
      ok: true,
      maskedEmail: maskEmail(cleanEmail),
      expiresInSeconds: 600,
    };
  }

  // Account status verification
  if (user.status !== "ACTIVE") {
    return {
      ok: false,
      error: "ACCOUNT_DISABLED",
      message: "Your account is not active. Please contact your workspace administrator.",
    };
  }

  // Generate 6-digit numeric OTP
  const otpCode = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
  const tokenHash = crypto.createHash("sha256").update(otpCode).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Clear previous OTP / reset tokens
  await db.verificationToken.deleteMany({
    where: { userId: user.id, type: "PASSWORD_RESET" },
  });

  // Store hashed OTP
  await db.verificationToken.create({
    data: {
      tokenHash,
      type: "PASSWORD_RESET",
      userId: user.id,
      expiresAt,
    },
  });

  const workspaceName = user.employee?.workspace?.companyName || "Business OS";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; background: #fffdf9; border: 1px solid #e7e2d8; border-radius: 8px; overflow: hidden; color: #1a1714;">
      <div style="padding: 24px 28px; border-bottom: 1px solid #e7e2d8; background: #f5f2ec;">
        <div style="font-size: 11px; font-weight: 700; color: #b5452a; letter-spacing: 0.1em; text-transform: uppercase;">BUSINESS OS · SECURITY</div>
        <h2 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 600; color: #1a1714;">Employee Account Verification</h2>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 14px; line-height: 1.5; color: #6b655c; margin: 0 0 20px 0;">
          A password recovery request was received for your Business OS employee access in <strong>${workspaceName}</strong>.
        </p>
        <div style="background: #f5f2ec; border: 1px solid #cdc6ba; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 11px; font-weight: 600; color: #9a948a; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 8px;">VERIFICATION CODE</span>
          <span style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1a1714;">${otpCode}</span>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: #9a948a; margin: 0;">
          This single-use code will expire in 10 minutes. If you did not request this code, your workspace remains secure and you can disregard this message.
        </p>
      </div>
    </div>
  `;

  try {
    await sendMail({
      to: cleanEmail,
      subject: `[${otpCode}] Business OS Verification Code`,
      html,
    });

    if (user.employee?.workspaceId) {
      await logEmployeeSecurityEvent({
        workspaceId: user.employee.workspaceId,
        employeeId: user.employee.id,
        action: "OTP_REQUESTED",
        actorName: user.name,
        detail: `Password recovery OTP requested by ${cleanEmail}.`,
      });
    }

    return {
      ok: true,
      maskedEmail: maskEmail(cleanEmail),
      expiresInSeconds: 600,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: "EMAIL_SERVICE_UNAVAILABLE",
      message: "Unable to dispatch email at this moment. Please contact your workspace administrator.",
    };
  }
}

/**
 * Validates the 6-digit OTP code and returns a reset session token.
 */
export async function verifyEmployeeRecoveryOtp(email: string, otpCode: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = otpCode.trim();

  const user = await db.user.findUnique({
    where: { email: cleanEmail },
    include: { employee: true },
  });

  if (!user) {
    return { ok: false, error: "INVALID_OTP", message: "That verification code is incorrect." };
  }

  const tokenHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

  const tokenRecord = await db.verificationToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    if (user.employee?.workspaceId) {
      await logEmployeeSecurityEvent({
        workspaceId: user.employee.workspaceId,
        employeeId: user.employee.id,
        action: "OTP_FAILED",
        actorName: user.name,
        detail: `Failed OTP attempt for ${cleanEmail}.`,
      });
    }
    return { ok: false, error: "INVALID_OTP", message: "That verification code is incorrect or has expired." };
  }

  // Consume the OTP token
  await db.verificationToken.delete({ where: { id: tokenRecord.id } });

  // Issue a short-lived reset authorization token (15 mins)
  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");

  await db.verificationToken.create({
    data: {
      tokenHash: resetTokenHash,
      type: "PASSWORD_RESET",
      userId: user.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  if (user.employee?.workspaceId) {
    await logEmployeeSecurityEvent({
      workspaceId: user.employee.workspaceId,
      employeeId: user.employee.id,
      action: "OTP_VERIFIED",
      actorName: user.name,
      detail: `OTP verified successfully for ${cleanEmail}.`,
    });
  }

  return {
    ok: true,
    resetToken: rawResetToken,
  };
}

/**
 * Resets employee password using the verified reset authorization token.
 */
export async function resetEmployeePasswordWithToken({
  resetToken,
  newPassword,
}: {
  resetToken: string;
  newPassword: string;
}) {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters long." };
  }

  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  const tokenRecord = await db.verificationToken.findFirst({
    where: {
      tokenHash,
      type: "PASSWORD_RESET",
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: { employee: true },
      },
    },
  });

  if (!tokenRecord || !tokenRecord.user) {
    return { ok: false, error: "INVALID_RESET_TOKEN", message: "Password reset session has expired. Please restart recovery." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Invalidate all tokens and update password
  await db.verificationToken.deleteMany({
    where: { userId: tokenRecord.userId },
  });

  await db.user.update({
    where: { id: tokenRecord.userId },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
      status: "ACTIVE",
    },
  });

  if (tokenRecord.user.employee?.workspaceId) {
    await logEmployeeSecurityEvent({
      workspaceId: tokenRecord.user.employee.workspaceId,
      employeeId: tokenRecord.user.employee.id,
      action: "PASSWORD_CHANGED",
      actorName: tokenRecord.user.name,
      detail: `Password reset successfully completed for ${tokenRecord.user.email}.`,
    });
  }

  return {
    ok: true,
    message: "Password updated successfully.",
  };
}

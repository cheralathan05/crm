import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

export type ProjectTeamName = "FRONTEND" | "BACKEND" | "DATABASE" | "QA";

export const PROJECT_TEAM_ROLES: Record<ProjectTeamName, string[]> = {
  FRONTEND: ["Frontend Developer", "Frontend Engineer", "UI Engineer"],
  BACKEND: ["Backend Developer", "API Engineer"],
  DATABASE: ["Database Engineer", "Database Administrator"],
  QA: ["QA Engineer", "Automation Test Engineer"],
};

export const TEAM_RESPONSIBILITIES: Record<ProjectTeamName, string> = {
  FRONTEND: "Frontend UI implementation, component architecture, client-side state management, and user experience integration.",
  BACKEND: "Backend API endpoints, business logic implementation, service integrations, and data validation.",
  DATABASE: "Schema architecture, database migrations, query optimization, and relational data modeling.",
  QA: "Quality assurance, automated test coverage, regression testing, and deliverable verification.",
};

export interface ValidateEmployeeInput {
  projectId: string;
  email: string;
  teamName?: ProjectTeamName;
  projectRole?: string;
}

export async function validateEmployeeForProjectInvitation(input: ValidateEmployeeInput) {
  const { projectId, email } = input;
  const normalizedEmail = (email || "").trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return {
      valid: false,
      canInvite: false,
      message: "Please enter a valid email address.",
    };
  }

  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, code: true, client: { select: { workspaceId: true } } },
  });

  if (!project) {
    throw new Error("Project not found: " + projectId);
  }

  const workspaceId = project.client.workspaceId;

  // Check existing employee
  const employee = await db.employee.findFirst({
    where: { workspaceId, email: normalizedEmail },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      department: true,
      role: { select: { name: true } },
    },
  });

  // Check existing user
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  });

  // Check existing ACTIVE project membership
  if (employee) {
    const existingAllocation = await db.projectStaffAllocation.findFirst({
      where: {
        projectId,
        employeeId: employee.id,
        releasedAt: null,
        status: "ACTIVE",
      },
    });

    if (existingAllocation) {
      return {
        valid: true,
        canInvite: false,
        isAlreadyMember: true,
        employeeName: employee.fullName,
        existingMemberRole: existingAllocation.projectRole,
        existingMemberTeam: existingAllocation.teamName,
        message: employee.fullName + " is already an active member of " + project.name + " on the " + existingAllocation.teamName + " team as " + existingAllocation.projectRole + ".",
      };
    }
  }

  // Check pending invitation
  const pendingInvitation = await db.employeeInvitation.findFirst({
    where: {
      projectId,
      recipientEmail: normalizedEmail,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  const employeeName = employee?.fullName || user?.name || normalizedEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    valid: true,
    canInvite: true,
    isAlreadyMember: false,
    hasExistingEmployee: !!employee,
    hasExistingAccount: !!user,
    employeeName,
    hasPendingInvitation: !!pendingInvitation,
    pendingInvitationId: pendingInvitation?.id,
    pendingTeam: pendingInvitation?.teamName,
    pendingRole: pendingInvitation?.projectRole,
    message: pendingInvitation
      ? "Notice: A pending invitation already exists on the " + pendingInvitation.teamName + " team. Sending a new invitation will replace the previous link."
      : employee
      ? "Existing employee found: " + employee.fullName + ". Ready to assign to project team."
      : "New employee. An invitation with secure access link will be dispatched.",
  };
}

export interface CreateProjectInvitationInput {
  projectId: string;
  teamName: ProjectTeamName;
  projectRole: string;
  recipientEmail: string;
  actorUserId?: string | null;
  actorName?: string;
  baseUrl?: string;
}

export async function createProjectInvitation(input: CreateProjectInvitationInput) {
  const { projectId, teamName, projectRole, recipientEmail, actorUserId, actorName = "Admin", baseUrl } = input;

  const email = (recipientEmail || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("Please enter a valid employee email address.");
  }

  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, code: true, client: { select: { workspaceId: true } } },
  });
  if (!project) {
    throw new Error("Project not found: " + projectId);
  }

  const workspaceId = project.client.workspaceId;

  const allowedRoles = PROJECT_TEAM_ROLES[teamName] || [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(projectRole)) {
    throw new Error("Role " + projectRole + " is not configured for the " + teamName + " team. Allowed roles: " + allowedRoles.join(", "));
  }

  let employee = await db.employee.findFirst({
    where: {
      workspaceId,
      email,
    },
  });

  if (!employee) {
    const empCode = "EMP-" + Date.now().toString().slice(-4);
    const derivedName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    employee = await db.employee.create({
      data: {
        workspaceId,
        employeeCode: empCode,
        fullName: derivedName,
        email,
        status: "INVITED",
        department: teamName === "FRONTEND" ? "DESIGN" : "ENGINEERING",
        primaryResponsibility: projectRole + " on " + teamName + " Team",
      },
    });
  }

  const existingAllocation = await db.projectStaffAllocation.findFirst({
    where: {
      projectId,
      employeeId: employee.id,
      releasedAt: null,
      status: "ACTIVE",
    },
  });

  if (existingAllocation) {
    throw new Error("This employee is already an active member of " + project.name + " (" + existingAllocation.projectRole + " on " + existingAllocation.teamName + " team).");
  }

  await db.employeeInvitation.updateMany({
    where: {
      projectId,
      recipientEmail: email,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.employeeInvitation.create({
    data: {
      workspaceId,
      projectId: project.id,
      employeeId: employee.id,
      recipientEmail: email,
      recipientName: employee.fullName,
      teamName,
      projectRole,
      tokenHash,
      status: "PENDING",
      expiresAt,
      deliveryAttempts: 1,
      invitedById: actorUserId || null,
      invitedByName: actorName,
    },
  });

  await db.projectActivity.create({
    data: {
      projectId: project.id,
      type: "TEAM_MEMBER_INVITED",
      title: "Team Invitation Dispatched",
      detail: actorName + " invited " + email + " to join " + project.name + " on the " + teamName + " team as " + projectRole + ".",
      actorName,
    },
  });

  const appDomain = baseUrl || process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const acceptUrl = appDomain + "/invite/" + rawToken;

  try {
    await sendMail({
      to: email,
      subject: "You have been invited to join " + project.name + " as " + projectRole,
      html: "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0c0e14; color: #e2e8f0; border-radius: 12px; border: 1px solid #1e293b; padding: 24px;\"><h2 style=\"color:#6366f1;\">BUSINESS OS — TEAM INVITATION</h2><p>Hello <strong>" + employee.fullName + "</strong>,</p><p>You have been invited by <strong>" + actorName + "</strong> to join <strong>" + project.name + "</strong>.</p><div style=\"background:#1e293b; padding:16px; border-radius:8px; margin:16px 0;\"><div><strong>Project:</strong> " + project.name + "</div><div><strong>Team:</strong> " + teamName + "</div><div><strong>Role:</strong> " + projectRole + "</div><div style=\"margin-top:8px; font-size:12px; color:#94a3b8;\"><strong>Responsibility:</strong> " + (TEAM_RESPONSIBILITIES[teamName] || "Project execution") + "</div></div><div style=\"text-align:center; margin:24px 0;\"><a href=\"" + acceptUrl + "\" style=\"background:#6366f1; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;\">ACCEPT INVITATION & ENTER WORKSPACE</a></div><p style=\"font-size:12px; color:#64748b;\">Link expires in 7 days.</p></div>",
    });
  } catch (mailError) {
    console.error("[createProjectInvitation] Email delivery failed:", mailError);
  }

  return {
    invitationId: invitation.id,
    acceptUrl,
    rawToken,
    recipientEmail: email,
    recipientName: employee.fullName,
    teamName,
    projectRole,
    status: invitation.status,
    expiresAt,
  };
}

export async function getInvitationDetails(rawToken: string) {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid or missing invitation token.");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash },
    include: {
      project: { select: { id: true, name: true, code: true } },
      employee: { select: { id: true, fullName: true, email: true, userId: true } },
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found or invalid link.");
  }

  const isExpired = invitation.expiresAt < new Date();
  if (isExpired && invitation.status === "PENDING") {
    await db.employeeInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    invitation.status = "EXPIRED";
  }

  const existingUser = await db.user.findUnique({
    where: { email: invitation.recipientEmail.toLowerCase() },
    select: { id: true, name: true, email: true },
  });

  const teamKey = (invitation.teamName as ProjectTeamName) || "FRONTEND";
  const responsibility = TEAM_RESPONSIBILITIES[teamKey] || "Execution of assigned deliverables and team collaboration.";

  return {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    projectName: invitation.project?.name || "Project Workspace",
    projectCode: invitation.project?.code,
    teamName: invitation.teamName || "FRONTEND",
    projectRole: invitation.projectRole || "Developer",
    responsibility,
    recipientEmail: invitation.recipientEmail,
    recipientName: invitation.recipientName,
    status: invitation.status,
    isExpired,
    hasExistingAccount: !!existingUser,
    existingUserName: existingUser?.name || null,
  };
}

export interface AcceptProjectInvitationInput {
  rawToken: string;
  password?: string;
  fullName?: string;
  existingUserId?: string | null;
}

export async function acceptProjectInvitation(input: AcceptProjectInvitationInput) {
  const { rawToken, password, fullName, existingUserId } = input;

  if (!rawToken) {
    throw new Error("Invitation token is required.");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash },
    include: {
      project: true,
      employee: true,
    },
  });

  if (!invitation) {
    throw new Error("Invalid or unrecognized invitation token.");
  }

  if (invitation.status !== "PENDING") {
    throw new Error("This invitation is no longer active (Status: " + invitation.status + ").");
  }

  if (invitation.expiresAt < new Date()) {
    await db.employeeInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("This invitation link has expired. Please ask the project admin for a new invitation.");
  }

  let finalUserId = existingUserId || invitation.employee.userId;

  if (!finalUserId) {
    const email = invitation.recipientEmail.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      finalUserId = existing.id;
    } else {
      if (!password || password.length < 6) {
        throw new Error("Please provide a password of at least 6 characters to secure your account.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const name = fullName || invitation.recipientName || email.split("@")[0];

      const newUser = await db.user.create({
        data: {
          email,
          name,
          companyName: invitation.project?.name || "Business OS",
          passwordHash: hashedPassword,
          role: "MEMBER",
          status: "ACTIVE",
          emailVerified: new Date(),
        },
      });

      finalUserId = newUser.id;
    }
  }

  const finalFullName = fullName || invitation.recipientName || invitation.employee.fullName;
  await db.employee.update({
    where: { id: invitation.employeeId },
    data: {
      userId: finalUserId,
      status: "ACTIVE",
      fullName: finalFullName,
      activatedAt: new Date(),
    },
  });

  const teamName = (invitation.teamName as ProjectTeamName) || "FRONTEND";
  const projectRole = invitation.projectRole || "Developer";

  if (invitation.projectId) {
    const existingAlloc = await db.projectStaffAllocation.findFirst({
      where: {
        projectId: invitation.projectId,
        employeeId: invitation.employeeId,
      },
    });

    if (existingAlloc) {
      await db.projectStaffAllocation.update({
        where: { id: existingAlloc.id },
        data: {
          teamName,
          projectRole,
          status: "ACTIVE",
          releasedAt: null,
          workstream: teamName,
        },
      });
    } else {
      await db.projectStaffAllocation.create({
        data: {
          projectId: invitation.projectId,
          employeeId: invitation.employeeId,
          teamName,
          projectRole,
          status: "ACTIVE",
          allocationPercentage: 100,
          workstream: teamName,
          permissions: JSON.stringify({
            workstream: teamName,
            canSubmitWork: true,
            canReportBlocker: true,
            canReviewDeliverables: teamName === "QA",
          }),
        },
      });
    }

    // Automatic Work Assignment
    const unassignedTasks = await db.clientTask.findMany({
      where: {
        projectId: invitation.projectId,
        workstream: teamName,
        assigneeId: null,
      },
      take: 3,
      orderBy: { createdAt: "asc" },
    });

    for (const task of unassignedTasks) {
      await db.clientTask.update({
        where: { id: task.id },
        data: {
          assigneeId: invitation.employeeId,
          assigneeName: finalFullName,
          status: "IN_PROGRESS",
        },
      });
    }

    // Automatic Team Conversation Enrollment
    let teamConv = await db.workConversation.findFirst({
      where: {
        projectId: invitation.projectId,
        type: "TEAM",
        teamName,
      },
    });

    if (!teamConv) {
      teamConv = await db.workConversation.create({
        data: {
          workspaceId: invitation.workspaceId,
          projectId: invitation.projectId,
          type: "TEAM",
          title: teamName + " Team",
          teamName,
          workstream: teamName,
          lastMessagePreview: "Team channel opened for " + teamName + ".",
        },
      });
    }

    const existingParticipant = await db.workConversationParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId: teamConv.id,
          employeeId: invitation.employeeId,
        },
      },
    });

    if (!existingParticipant) {
      await db.workConversationParticipant.create({
        data: {
          conversationId: teamConv.id,
          employeeId: invitation.employeeId,
          userId: finalUserId,
          role: "MEMBER",
        },
      });

      await db.workMessage.create({
        data: {
          conversationId: teamConv.id,
          senderEmployeeId: invitation.employeeId,
          senderUserId: finalUserId,
          senderName: finalFullName,
          senderRole: projectRole,
          senderTeam: teamName,
          content: "Joined " + (invitation.project?.name || "the project") + " as " + projectRole + ".",
          messageType: "SYSTEM",
        },
      });
    }

    await db.projectActivity.create({
      data: {
        projectId: invitation.projectId,
        type: "TEAM_MEMBER_ADDED",
        title: "Team Member Joined",
        detail: finalFullName + " accepted invitation and joined " + (invitation.project?.name || "the project") + " as " + projectRole + " on the " + teamName + " team.",
        actorName: finalFullName,
      },
    });
  }

  await db.employeeInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  return {
    ok: true,
    projectId: invitation.projectId,
    projectName: invitation.project?.name,
    teamName: invitation.teamName,
    projectRole: invitation.projectRole,
    employeeId: invitation.employeeId,
    userId: finalUserId,
    redirectUrl: "/employee?projectId=" + invitation.projectId,
  };
}
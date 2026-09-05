import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import {
  ProjectTeamName,
  PROJECT_TEAM_ROLES,
  TEAM_RESPONSIBILITIES,
} from "./project-invitation.types";

export type { ProjectTeamName };
export { PROJECT_TEAM_ROLES, TEAM_RESPONSIBILITIES };

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
    select: {
      id: true,
      name: true,
      code: true,
      client: { select: { workspaceId: true, companyName: true } },
      productAreas: { where: { phase: "MVP" }, select: { name: true } },
    },
  });
  if (!project) {
    throw new Error("Project not found: " + projectId);
  }

  const workspaceId = project.client.workspaceId;
  const clientCompany = project.client.companyName || "Enterprise Client";
  const approvedProductAreas = project.productAreas?.map((p: any) => p.name) || [];

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
        department: "ENGINEERING",
        primaryResponsibility: TEAM_RESPONSIBILITIES[teamName] || "Project execution",
        status: "INVITED",
      },
    });
  }

  // Revoke any previous pending invitations for this project + email
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

  const teamColors: Record<string, { hex: string; bg: string }> = {
    FRONTEND: { hex: "#3b82f6", bg: "#1e3a8a" },
    BACKEND: { hex: "#6366f1", bg: "#312e81" },
    DATABASE: { hex: "#10b981", bg: "#064e3b" },
    QA: { hex: "#f59e0b", bg: "#78350f" },
  };
  const squadColor = teamColors[teamName] || { hex: "#6366f1", bg: "#312e81" };

  try {
    await sendMail({
      to: email,
      subject: `[BUSINESS OS] Project Invitation: ${project.name} • ${teamName} Team (${projectRole})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #07090e; color: #f1f5f9; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 28px 24px; border-bottom: 1px solid #334155; text-align: center;">
            <div style="display: inline-block; font-family: monospace; font-size: 11px; letter-spacing: 2px; color: ${squadColor.hex}; text-transform: uppercase; font-weight: bold; background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 999px; border: 1px solid ${squadColor.hex}40; margin-bottom: 12px;">
              BUSINESS OS • SQUAD INVITATION
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
              You've Been Invited to Join the Team
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-family: monospace;">
              ${actorName} has assigned you to an active project squad.
            </p>
          </div>

          <!-- Project & Squad Specification Card -->
          <div style="padding: 24px;">
            <div style="background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 20px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-family: monospace; text-transform: uppercase; font-size: 11px; width: 130px;">PROJECT</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #ffffff;">${project.name} ${project.code ? `(${project.code})` : ""}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-family: monospace; text-transform: uppercase; font-size: 11px;">CLIENT</td>
                  <td style="padding: 6px 0; color: #cbd5e1;">${clientCompany}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-family: monospace; text-transform: uppercase; font-size: 11px;">ASSIGNED SQUAD</td>
                  <td style="padding: 6px 0;">
                    <span style="background: ${squadColor.bg}; color: #ffffff; font-weight: bold; font-family: monospace; font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid ${squadColor.hex}60;">
                      ${teamName} SQUAD
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-family: monospace; text-transform: uppercase; font-size: 11px;">PROJECT ROLE</td>
                  <td style="padding: 6px 0; font-weight: bold; color: ${squadColor.hex}; font-family: monospace;">${projectRole}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-family: monospace; text-transform: uppercase; font-size: 11px;">RECIPIENT</td>
                  <td style="padding: 6px 0; color: #94a3b8; font-family: monospace;">${employee.fullName} (${email})</td>
                </tr>
              </table>

              <!-- Product Scope & Boundary -->
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e293b;">
                <div style="font-size: 11px; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">TECHNICAL RESPONSIBILITY</div>
                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  ${TEAM_RESPONSIBILITIES[teamName] || "Execution of approved deliverables."}
                </div>
              </div>

              ${approvedProductAreas.length > 0 ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #1e293b;">
                <div style="font-size: 11px; font-family: monospace; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">APPROVED MVP PRODUCT SCOPE</div>
                <div style="font-size: 11px; font-family: monospace; color: #94a3b8;">
                  ${approvedProductAreas.join(" • ")}
                </div>
              </div>` : ""}

              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #1e293b; font-size: 11px; font-family: monospace; color: #10b981;">
                ✓ Strict Role Boundary Enforced: You will only receive verified ${teamName.toLowerCase()} responsibilities. Zero task leakage.
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 24px 0 16px 0;">
              <a href="${acceptUrl}" style="background: ${squadColor.hex}; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
                ACCEPT INVITATION & ENTER SQUAD WORKSPACE →
              </a>
            </div>

            <p style="text-align: center; font-size: 11px; color: #64748b; font-family: monospace; margin: 0;">
              This is a single-use secure link. It expires in 7 days.
            </p>
          </div>
        </div>
      `,
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
    projectId: project.id,
    projectName: project.name,
    projectCode: project.code,
    clientCompany,
    approvedProductAreas,
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
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          client: { select: { companyName: true } },
          productAreas: { where: { phase: "MVP" }, select: { name: true } },
        },
      },
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
  const approvedProductAreas = invitation.project?.productAreas?.map((p: any) => p.name) || [];
  const clientCompany = invitation.project?.client?.companyName || "Enterprise Client";

  return {
    invitationId: invitation.id,
    projectId: invitation.projectId,
    projectName: invitation.project?.name || "Project Workspace",
    projectCode: invitation.project?.code,
    clientCompany,
    teamName: invitation.teamName || "FRONTEND",
    projectRole: invitation.projectRole || "Developer",
    responsibility,
    approvedProductAreas,
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

    // Automatic Work Assignment of Authentic Proposal Tasks (Section 09, 10, 38)
    const authenticSquadTasks = await db.clientTask.findMany({
      where: {
        projectId: invitation.projectId,
        workstream: teamName,
        isInvalidWork: false,
        productAreaId: { not: null },
        phase: "MVP",
      },
      orderBy: { createdAt: "asc" },
    });

    const unassignedTasks = authenticSquadTasks.filter((t) => !t.assigneeId);
    const demoHeldTasks = authenticSquadTasks.filter(
      (t) => t.assigneeName?.toLowerCase().includes("john") || t.assigneeName?.toLowerCase().includes("demo")
    );

    const tasksToAssign =
      unassignedTasks.length > 0
        ? unassignedTasks
        : demoHeldTasks.length > 0
        ? demoHeldTasks
        : authenticSquadTasks;

    for (const task of tasksToAssign.slice(0, 4)) {
      await db.clientTask.update({
        where: { id: task.id },
        data: {
          assigneeId: invitation.employeeId,
          assigneeName: finalFullName,
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
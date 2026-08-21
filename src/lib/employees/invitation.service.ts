import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";

/**
 * Generate a cryptographically secure token and its SHA-256 hash.
 */
export function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Dispatch an onboarding invitation email to a newly created or existing employee.
 */
export async function sendEmployeeInvitation({
  workspaceId,
  employeeId,
  actorName = "Admin",
  actorId,
  baseUrl,
}: {
  workspaceId: string;
  employeeId: string;
  actorName?: string;
  actorId?: string;
  baseUrl?: string;
}) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });
  if (!workspace) throw new Error("Workspace not found.");

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { role: true, team: true },
  });
  if (!employee) throw new Error("Employee record not found.");

  const { rawToken, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days validity

  // Create or update invitation record
  const invitation = await db.employeeInvitation.create({
    data: {
      workspaceId,
      employeeId: employee.id,
      recipientEmail: employee.email,
      recipientName: employee.fullName,
      roleId: employee.roleId,
      teamId: employee.teamId,
      tokenHash,
      status: "SENDING",
      expiresAt,
      deliveryAttempts: 1,
      invitedById: actorId,
      invitedByName: actorName,
    },
  });

  const domain = baseUrl || process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const activationUrl = `${domain}/invite/${rawToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0c0e14; color: #e2e8f0; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
      <div style="padding: 32px 28px; background: linear-gradient(180deg, #1e1b4b 0%, #0c0e14 100%); border-bottom: 1px solid #1e293b;">
        <div style="font-size: 13px; font-weight: 700; color: #818cf8; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">EMPLOYEE OS · INVITATION</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Welcome to ${workspace.companyName}</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">You have been invited to join the delivery organization as an operational team member.</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #131722; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b; padding-bottom: 8px; width: 35%;">Team Member:</td>
              <td style="color: #f8fafc; font-weight: 600; padding-bottom: 8px;">${employee.fullName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding-bottom: 8px;">Role:</td>
              <td style="color: #818cf8; font-weight: 600; padding-bottom: 8px;">${employee.role?.name || "Team Member"}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding-bottom: 8px;">Team:</td>
              <td style="color: #f8fafc; font-weight: 600; padding-bottom: 8px;">${employee.team?.name || "General Delivery"}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Primary Focus:</td>
              <td style="color: #cbd5e1;">${employee.primaryResponsibility || "Execution and Engineering Delivery"}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px;">
          To activate your credentials, view your assigned responsibilities, and access your workspace, please click the secure activation button below:
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${activationUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
            Activate Account & Join Team →
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; pt: 16px;">
          This secure invitation link will expire in 7 days on ${expiresAt.toLocaleDateString()}. If you were not expecting this invitation, you may ignore this email.
        </p>
      </div>
    </div>
  `;

  try {
    const result = await sendMail({
      to: employee.email,
      subject: `Invitation to join ${workspace.companyName} on Business OS`,
      html,
    });

    if (result.success) {
      await db.employeeInvitation.update({
        where: { id: invitation.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await db.employeeAuditEvent.create({
        data: {
          workspaceId,
          employeeId: employee.id,
          action: "INVITATION_SENT",
          actorName,
          detail: `Invitation successfully dispatched to ${employee.email}.`,
          afterState: JSON.stringify({ invitationId: invitation.id, recipient: employee.email }),
        },
      });

      return { ok: true, invitationId: invitation.id, status: "SENT" };
    } else {
      await db.employeeInvitation.update({
        where: { id: invitation.id },
        data: { status: "FAILED", deliveryError: result.error || "Email provider error." },
      });

      return { ok: false, invitationId: invitation.id, status: "FAILED", error: result.error };
    }
  } catch (err: any) {
    await db.employeeInvitation.update({
      where: { id: invitation.id },
      data: { status: "FAILED", deliveryError: err.message || "Failed to send email." },
    });
    return { ok: false, invitationId: invitation.id, status: "FAILED", error: err.message };
  }
}

/**
 * Validate an invitation token from a public access URL.
 */
export async function validateInvitationToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash },
    include: {
      workspace: {
        select: {
          id: true,
          companyName: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
      employee: {
        include: {
          role: true,
          team: {
            include: {
              teamLead: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, reason: "INVALID_TOKEN", message: "This invitation link is invalid or does not exist." };
  }

  if (invitation.status === "REVOKED") {
    return { valid: false, reason: "REVOKED", message: "This invitation has been revoked by the workspace administrator." };
  }

  if (invitation.status === "ACCEPTED") {
    return { valid: false, reason: "ALREADY_ACCEPTED", message: "This invitation has already been accepted. Please log in." };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, reason: "EXPIRED", message: "This invitation link has expired. Please request a new invitation." };
  }

  // Update status to OPENED if it was SENT
  if (invitation.status === "SENT") {
    await db.employeeInvitation.update({
      where: { id: invitation.id },
      data: { status: "OPENED", lastOpenedAt: new Date() },
    });

    await db.employeeAuditEvent.create({
      data: {
        workspaceId: invitation.workspaceId,
        employeeId: invitation.employeeId,
        action: "INVITATION_OPENED",
        actorName: invitation.recipientName,
        detail: `Invitation link opened by recipient ${invitation.recipientEmail}.`,
      },
    });
  }

  const manager =
    invitation.employee.team?.teamLead?.fullName ||
    invitation.invitedByName ||
    invitation.workspace.owner.name ||
    "Workspace Administrator";

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      recipientEmail: invitation.recipientEmail,
      recipientName: invitation.recipientName,
      workspaceName: invitation.workspace.companyName,
      role: invitation.employee.role,
      team: invitation.employee.team,
      department: invitation.employee.department,
      employeeCode: invitation.employee.employeeCode,
      primaryResponsibility: invitation.employee.primaryResponsibility,
      invitedByName: invitation.invitedByName || invitation.workspace.owner.name,
      managerName: manager,
      expiresAt: invitation.expiresAt,
    },
  };
}

/**
 * Accept invitation and activate user account in a single atomic transaction.
 */
export async function activateEmployeeAccount({
  rawToken,
  password,
}: {
  rawToken: string;
  password: string;
}) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.employeeInvitation.findUnique({
    where: { tokenHash },
    include: {
      workspace: true,
      employee: true,
    },
  });

  if (!invitation || invitation.status === "ACCEPTED" || invitation.status === "REVOKED") {
    throw new Error("Invalid or unusable invitation token.");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("This invitation has expired.");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Check if User already exists with this email
  let user = await db.user.findUnique({
    where: { email: invitation.recipientEmail },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: invitation.recipientName,
        companyName: invitation.workspace.companyName,
        email: invitation.recipientEmail,
        passwordHash,
        emailVerified: new Date(),
        role: "MEMBER",
        status: "ACTIVE",
        provider: "EMAIL",
      },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
  }

  // Mark Employee as ACTIVE and link to User
  const updatedEmployee = await db.employee.update({
    where: { id: invitation.employeeId },
    data: {
      userId: user.id,
      status: "ACTIVE",
      activatedAt: new Date(),
      lastActiveAt: new Date(),
    },
  });

  // Mark Invitation as ACCEPTED
  await db.employeeInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  // Record Audit Event
  await db.employeeAuditEvent.create({
    data: {
      workspaceId: invitation.workspaceId,
      employeeId: updatedEmployee.id,
      action: "INVITATION_ACCEPTED",
      actorName: updatedEmployee.fullName,
      detail: `Account successfully activated by ${updatedEmployee.email}. Status moved to ACTIVE.`,
      afterState: JSON.stringify({ userId: user.id, status: "ACTIVE" }),
    },
  });

  return { ok: true, employee: updatedEmployee, user };
}

/**
 * Extend expiration date of an active invitation.
 */
export async function extendInvitationExpiration(
  invitationId: string,
  days = 7,
  actorName = "Admin",
) {
  const inv = await db.employeeInvitation.findUnique({
    where: { id: invitationId },
  });
  if (!inv) throw new Error("Invitation not found.");

  const newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const updated = await db.employeeInvitation.update({
    where: { id: invitationId },
    data: { expiresAt: newExpiresAt },
  });

  await db.employeeAuditEvent.create({
    data: {
      workspaceId: inv.workspaceId,
      employeeId: inv.employeeId,
      action: "INVITATION_EXTENDED",
      actorName,
      detail: `Invitation validity extended by ${days} days until ${newExpiresAt.toLocaleDateString()}.`,
    },
  });

  return updated;
}

/**
 * Revoke an active invitation.
 */
export async function revokeInvitation(
  invitationId: string,
  actorName = "Admin",
) {
  const inv = await db.employeeInvitation.findUnique({
    where: { id: invitationId },
  });
  if (!inv) throw new Error("Invitation not found.");

  const updated = await db.employeeInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  await db.employeeAuditEvent.create({
    data: {
      workspaceId: inv.workspaceId,
      employeeId: inv.employeeId,
      action: "INVITATION_REVOKED",
      actorName,
      detail: `Invitation for ${inv.recipientEmail} was revoked.`,
    },
  });

  return updated;
}


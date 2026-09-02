import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureDefaultRoles,
  getEmployeeDirectory,
  getTeamHealthReport,
  getTeamPulseMetrics,
} from "@/lib/employees/employee.service";
import { sendEmployeeInvitation } from "@/lib/employees/invitation.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace = await db.workspace.findFirst({
      where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
    }) || await db.workspace.findFirst();

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    // Ensure default system roles exist
    await ensureDefaultRoles(workspace.id);

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || undefined;
    const search = searchParams.get("search") || undefined;
    const department = searchParams.get("department") || undefined;
    const roleId = searchParams.get("roleId") || undefined;

    const [metrics, health, employees, roles, teams] = await Promise.all([
      getTeamPulseMetrics(workspace.id),
      getTeamHealthReport(workspace.id),
      getEmployeeDirectory(workspace.id, { filter, search, department, roleId }),
      db.organizationRole.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
      db.organizationTeam.findMany({ where: { workspaceId: workspace.id }, include: { members: true, teamLead: true } }),
    ]);

    return NextResponse.json({
      ok: true,
      workspace: { id: workspace.id, companyName: workspace.companyName },
      metrics,
      health,
      employees,
      roles,
      teams,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch employees." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace = await db.workspace.findFirst({
      where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
    }) || await db.workspace.findFirst();

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const {
      fullName,
      preferredName,
      email,
      phone,
      department = "ENGINEERING",
      timezone = "UTC+05:30",
      location,
      employmentType = "FULL_TIME",
      roleId,
      teamId,
      primaryResponsibility,
      secondaryResponsibilities = [],
      accountabilities = [],
      deliverableOwnership = [],
      approvalResponsibility = [],
      escalationResponsibility = [],
      capabilities = [],
      customPermissions = {},
      capacityTargetHours = 40.0,
      sendInvitation = true,
    } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { ok: false, message: "Full name and email are required." },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness within workspace
    const existing = await db.employee.findFirst({
      where: { workspaceId: workspace.id, email: cleanEmail },
      include: { role: true, team: true },
    });

    let employee: any = null;
    let employeeCode = "";

    if (existing) {
      if (existing.status === "OFFBOARDED") {
        // Reactivate previously offboarded employee record
        employeeCode = existing.employeeCode;
        employee = await db.employee.update({
          where: { id: existing.id },
          data: {
            fullName: fullName.trim(),
            preferredName: preferredName?.trim() || null,
            phone: phone?.trim() || null,
            status: sendInvitation ? "INVITED" : "ACTIVE",
            department,
            timezone,
            location: location?.trim() || null,
            employmentType,
            roleId: roleId || null,
            teamId: teamId || null,
            primaryResponsibility: primaryResponsibility?.trim() || null,
            secondaryResponsibilities: JSON.stringify(secondaryResponsibilities),
            accountabilities: JSON.stringify(accountabilities),
            deliverableOwnership: JSON.stringify(deliverableOwnership),
            approvalResponsibility: JSON.stringify(approvalResponsibility),
            escalationResponsibility: JSON.stringify(escalationResponsibility),
            capabilities: JSON.stringify(capabilities),
            customPermissions: JSON.stringify(customPermissions),
            capacityTargetHours: Number(capacityTargetHours) || 40.0,
            offboardedAt: null,
            offboardedReason: null,
            offboardedNotes: null,
          },
          include: { role: true, team: true },
        });
      } else {
        return NextResponse.json(
          {
            ok: false,
            message: `An employee with email '${cleanEmail}' already exists (${existing.fullName} - ${existing.employeeCode}). You can re-invite them from their profile in the Directory.`,
          },
          { status: 409 },
        );
      }
    } else {
      // Auto-generate employee code (e.g. EMP-001, EMP-002)
      const empCount = await db.employee.count({ where: { workspaceId: workspace.id } });
      employeeCode = `EMP-${String(empCount + 1).padStart(3, "0")}`;

      // Create Employee record
      employee = await db.employee.create({
        data: {
          workspaceId: workspace.id,
          employeeCode,
          fullName: fullName.trim(),
          preferredName: preferredName?.trim() || null,
          email: cleanEmail,
          phone: phone?.trim() || null,
          status: sendInvitation ? "INVITED" : "ACTIVE",
          department,
          timezone,
          location: location?.trim() || null,
          employmentType,
          roleId: roleId || null,
          teamId: teamId || null,
          primaryResponsibility: primaryResponsibility?.trim() || null,
          secondaryResponsibilities: JSON.stringify(secondaryResponsibilities),
          accountabilities: JSON.stringify(accountabilities),
          deliverableOwnership: JSON.stringify(deliverableOwnership),
          approvalResponsibility: JSON.stringify(approvalResponsibility),
          escalationResponsibility: JSON.stringify(escalationResponsibility),
          capabilities: JSON.stringify(capabilities),
          customPermissions: JSON.stringify(customPermissions),
          capacityTargetHours: Number(capacityTargetHours) || 40.0,
        },
        include: {
          role: true,
          team: true,
        },
      });
    }

    // Create audit event
    await db.employeeAuditEvent.create({
      data: {
        workspaceId: workspace.id,
        employeeId: employee.id,
        action: "EMPLOYEE_CREATED",
        actorName: user?.name || "Admin",
        detail: `Onboarded employee ${employee.fullName} (${employee.employeeCode}) with role ${employee.role?.name || "None"}.`,
        afterState: JSON.stringify({
          employeeCode: employee.employeeCode,
          email: employee.email,
          role: employee.role?.name,
        }),
      },
    });

    let invitationResult = null;
    if (sendInvitation) {
      const baseUrl = req.headers.get("origin") || undefined;
      invitationResult = await sendEmployeeInvitation({
        workspaceId: workspace.id,
        employeeId: employee.id,
        actorName: user?.name || "Admin",
        actorId: user?.id,
        baseUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      employee,
      invitation: invitationResult,
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { ok: false, message: "An employee with this email already exists in this workspace." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to create employee." },
      { status: 500 },
    );
  }
}

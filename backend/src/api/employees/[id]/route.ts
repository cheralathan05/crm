import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getEmployeeWorkspaceDetails,
  offboardEmployee,
} from "@/lib/employees/employee.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const details = await getEmployeeWorkspaceDetails(id);
    if (!details) {
      return NextResponse.json(
        { ok: false, message: "Employee not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...details });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load employee details." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user;
    const { id } = await params;
    const body = await req.json();

    const current = await db.employee.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ ok: false, message: "Employee not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (body.fullName !== undefined) updateData.fullName = body.fullName.trim();
    if (body.preferredName !== undefined) updateData.preferredName = body.preferredName?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.location !== undefined) updateData.location = body.location?.trim() || null;
    if (body.employmentType !== undefined) updateData.employmentType = body.employmentType;
    if (body.roleId !== undefined) updateData.roleId = body.roleId || null;
    if (body.teamId !== undefined) updateData.teamId = body.teamId || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.primaryResponsibility !== undefined) updateData.primaryResponsibility = body.primaryResponsibility?.trim() || null;
    if (body.secondaryResponsibilities !== undefined) updateData.secondaryResponsibilities = JSON.stringify(body.secondaryResponsibilities);
    if (body.accountabilities !== undefined) updateData.accountabilities = JSON.stringify(body.accountabilities);
    if (body.deliverableOwnership !== undefined) updateData.deliverableOwnership = JSON.stringify(body.deliverableOwnership);
    if (body.approvalResponsibility !== undefined) updateData.approvalResponsibility = JSON.stringify(body.approvalResponsibility);
    if (body.escalationResponsibility !== undefined) updateData.escalationResponsibility = JSON.stringify(body.escalationResponsibility);
    if (body.capabilities !== undefined) updateData.capabilities = JSON.stringify(body.capabilities);
    if (body.customPermissions !== undefined) updateData.customPermissions = JSON.stringify(body.customPermissions);
    if (body.capacityTargetHours !== undefined) updateData.capacityTargetHours = Number(body.capacityTargetHours);

    const updated = await db.employee.update({
      where: { id },
      data: updateData,
      include: { role: true, team: true },
    });

    // Record audit event if role or team changed
    if (body.roleId !== undefined && body.roleId !== current.roleId) {
      await db.employeeAuditEvent.create({
        data: {
          workspaceId: current.workspaceId,
          employeeId: current.id,
          action: "ROLE_CHANGED",
          actorName: user?.name || "Admin",
          detail: `Role changed to ${updated.role?.name || "None"}.`,
          beforeState: JSON.stringify({ roleId: current.roleId }),
          afterState: JSON.stringify({ roleId: updated.roleId, roleName: updated.role?.name }),
        },
      });
    }

    if (body.teamId !== undefined && body.teamId !== current.teamId) {
      await db.employeeAuditEvent.create({
        data: {
          workspaceId: current.workspaceId,
          employeeId: current.id,
          action: "TEAM_CHANGED",
          actorName: user?.name || "Admin",
          detail: `Team changed to ${updated.team?.name || "None"}.`,
          beforeState: JSON.stringify({ teamId: current.teamId }),
          afterState: JSON.stringify({ teamId: updated.teamId, teamName: updated.team?.name }),
        },
      });
    }

    return NextResponse.json({ ok: true, employee: updated });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to update employee." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const user = session?.user;
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reassignToEmployeeId = searchParams.get("reassignToEmployeeId") || undefined;
    const notes = searchParams.get("notes") || undefined;

    const offboarded = await offboardEmployee(
      id,
      reassignToEmployeeId,
      notes,
      user?.name || "Admin",
    );

    return NextResponse.json({ ok: true, employee: offboarded });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to offboard employee." },
      { status: 500 },
    );
  }
}

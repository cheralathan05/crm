import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getProjectsForAssignment,
  getEmployeesForProject,
  getResponsibilitiesForEmployee,
  executeWorkstreamAssignment,
  WORKSTREAM_LABELS,
} from "@/lib/employees/workstream-assignment.service";

/* ── GET /api/employees/assign-work ──────────────────────────────────
   Without projectId → returns project list for selection
   With projectId    → returns employees with compatibility info
──────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace =
      (await db.workspace.findFirst({
        where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
      })) || (await db.workspace.findFirst());

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      // Return projects list
      const projects = await getProjectsForAssignment(workspace.id);
      return NextResponse.json({ ok: true, projects });
    }

    // Return employees for a specific project
    const employees = await getEmployeesForProject(workspace.id, projectId);

    // For each employee, include their compatible responsibilities
    const employeesWithResponsibilities = employees.map((emp) => ({
      ...emp,
      responsibilities: getResponsibilitiesForEmployee(emp.roleCode, emp.roleName),
    }));

    return NextResponse.json({
      ok: true,
      employees: employeesWithResponsibilities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load assignment data." },
      { status: 500 }
    );
  }
}

/* ── POST /api/employees/assign-work ─────────────────────────────────
   Execute the workstream assignment
   Body: { employeeId, projectId, workstream }
──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace =
      (await db.workspace.findFirst({
        where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
      })) || (await db.workspace.findFirst());

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const body = await req.json();
    const { employeeId, projectId, workstream } = body;

    if (!employeeId || !projectId || !workstream) {
      return NextResponse.json(
        { ok: false, message: "Employee ID, Project ID, and Workstream are required." },
        { status: 400 }
      );
    }

    const result = await executeWorkstreamAssignment(
      employeeId,
      projectId,
      workstream,
      user?.name || "Admin"
    );

    return NextResponse.json({
      ok: true,
      ...result,
      workstreamLabel: WORKSTREAM_LABELS[workstream] || workstream,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to execute assignment." },
      { status: 500 }
    );
  }
}

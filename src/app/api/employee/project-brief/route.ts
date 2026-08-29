import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { getOrGenerateEmployeeProjectBrief } from "@/lib/employees/employee-project-brief.service";
import { db } from "@/lib/db";

/* ── GET /api/employee/project-brief ──────────────────────────────────
   Fetches or generates the real Employee Project Brief for the employee's active project.
   Supports ?projectId=... and optional ?previewEmployeeId=...
──────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get("projectId");
    const previewEmployeeId = searchParams.get("previewEmployeeId");

    let employeeId: string | null = null;
    let employeeName: string | null = null;

    if (previewEmployeeId) {
      const previewEmp = await db.employee.findUnique({
        where: { id: previewEmployeeId },
      });
      if (previewEmp) {
        employeeId = previewEmp.id;
        employeeName = previewEmp.fullName;
      }
    }

    if (!employeeId) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { ok: false, message: "Your session has expired. Please sign in." },
          { status: 401 }
        );
      }

      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        employeeId = context.employee.id;
        employeeName = context.employee.fullName;
      } else if (context.isOwnerOrAdmin) {
        // Find first active employee for admin testing/preview
        const firstEmp = await db.employee.findFirst({
          where: { status: { in: ["ACTIVE", "INVITED"] } },
        });
        if (firstEmp) {
          employeeId = firstEmp.id;
          employeeName = firstEmp.fullName;
        }
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, message: "No employee record found for this account." },
        { status: 403 }
      );
    }

    // Resolve target project: requested or first assigned project or latest active project
    let projectId = requestedProjectId;

    if (!projectId) {
      const allocation = await db.projectStaffAllocation.findFirst({
        where: { employeeId, releasedAt: null },
        orderBy: { joinedAt: "desc" },
      });
      projectId = allocation?.projectId || null;
    }

    if (!projectId) {
      const latestProject = await db.clientProject.findFirst({
        orderBy: { createdAt: "desc" },
      });
      projectId = latestProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json(
        { ok: false, message: "No projects exist in this workspace." },
        { status: 404 }
      );
    }

    // Fetch list of all projects assigned to this employee (for project switcher)
    const assignedProjects = await db.projectStaffAllocation.findMany({
      where: { employeeId, releasedAt: null },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            stage: true,
            health: true,
            progress: true,
          },
        },
      },
    });

    const allWorkspaceProjects = await db.clientProject.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        stage: true,
        health: true,
        progress: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const brief = await getOrGenerateEmployeeProjectBrief(projectId, employeeId, false);

    return NextResponse.json({
      ok: true,
      brief,
      availableProjects: assignedProjects.length > 0
        ? assignedProjects.map((a) => a.project)
        : allWorkspaceProjects,
      currentEmployee: {
        id: employeeId,
        name: employeeName,
      },
    });
  } catch (err: any) {
    console.error("[api/employee/project-brief] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load employee project brief." },
      { status: 500 }
    );
  }
}

/* ── POST /api/employee/project-brief ─────────────────────────────────
   Forces re-generation / update of the Project Brief when project facts change.
──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { projectId, employeeId, forceRefresh } = body;

    let targetEmployeeId = employeeId;

    if (!targetEmployeeId && session?.user?.id) {
      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        targetEmployeeId = context.employee.id;
      }
    }

    if (!projectId || !targetEmployeeId) {
      return NextResponse.json(
        { ok: false, message: "Project ID and Employee ID are required." },
        { status: 400 }
      );
    }

    const brief = await getOrGenerateEmployeeProjectBrief(projectId, targetEmployeeId, forceRefresh ?? true);

    return NextResponse.json({
      ok: true,
      brief,
      message: "Employee Project Brief synchronized successfully.",
    });
  } catch (err: any) {
    console.error("[api/employee/project-brief] refresh error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to refresh project brief." },
      { status: 500 }
    );
  }
}

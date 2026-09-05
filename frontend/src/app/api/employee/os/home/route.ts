import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { getEmployeeOSHomeData } from "@/lib/employees/employee-os.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get("projectId");
    const previewEmployeeId = searchParams.get("previewEmployeeId");

    let employeeId: string | null = null;

    if (previewEmployeeId) {
      employeeId = previewEmployeeId;
    } else if (session?.user?.id) {
      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        employeeId = context.employee.id;
      } else if (context.isOwnerOrAdmin) {
        const firstEmp = await db.employee.findFirst({ where: { status: { in: ["ACTIVE", "INVITED"] } } });
        employeeId = firstEmp?.id || null;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ ok: false, message: "Unauthorized or no employee profile." }, { status: 401 });
    }

    let projectId = requestedProjectId;
    if (!projectId) {
      const alloc = await db.projectStaffAllocation.findFirst({
        where: { employeeId, releasedAt: null },
        orderBy: { joinedAt: "desc" },
      });
      projectId = alloc?.projectId || null;
    }

    if (!projectId) {
      const latestProject = await db.clientProject.findFirst({ orderBy: { createdAt: "desc" } });
      projectId = latestProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "No active projects found." }, { status: 404 });
    }

    const data = await getEmployeeOSHomeData(projectId, employeeId);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/employee/os/home] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load employee OS home." }, { status: 500 });
  }
}

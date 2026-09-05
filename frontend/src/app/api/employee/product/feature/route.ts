import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { getFeatureDetail } from "@/lib/employees/employee-product-workspace.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const featureName = searchParams.get("name") || "Core Experience";
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
        const firstEmp = await db.employee.findFirst();
        employeeId = firstEmp?.id || null;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    let projectId = requestedProjectId;
    if (!projectId) {
      const alloc = await db.projectStaffAllocation.findFirst({ where: { employeeId, releasedAt: null } });
      projectId = alloc?.projectId || null;
    }

    if (!projectId) {
      const latestProject = await db.clientProject.findFirst({ orderBy: { createdAt: "desc" } });
      projectId = latestProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "No active projects." }, { status: 404 });
    }

    const feature = await getFeatureDetail(projectId, employeeId, featureName);
    return NextResponse.json({ ok: true, feature });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to load feature." }, { status: 500 });
  }
}

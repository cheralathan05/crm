import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { getEmployeeBuildModeData } from "@/lib/employees/employee-project-brief.service";
import { db } from "@/lib/db";

/* ── GET /api/employee/build-mode ─────────────────────────────────────
   Returns deep build workspace context for an engineer (Frontend, Backend, Database, QA).
──────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const capabilityId = searchParams.get("capabilityId") || undefined;
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

    if (!employeeId || !projectId) {
      return NextResponse.json(
        { ok: false, message: "Valid Employee ID and Project ID are required." },
        { status: 400 }
      );
    }

    const data = await getEmployeeBuildModeData({
      projectId,
      employeeId,
      capabilityId,
    });

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error("[api/employee/build-mode] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load build mode workspace." },
      { status: 500 }
    );
  }
}

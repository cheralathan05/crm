import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEmployeePortalData } from "@/lib/employees/employee-work-portal.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get("projectId");
    const previewEmployeeId = searchParams.get("previewEmployeeId");

    let employeeId = previewEmployeeId;
    if (!employeeId) {
      // Find employee record by userId or email
      const employee = await db.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
          ],
        },
      });
      employeeId = employee?.id || null;
    }

    // If still not found and user is OWNER/ADMIN, fallback to first active employee
    if (!employeeId && (user.role === "OWNER" || user.role === "ADMIN")) {
      const firstEmp = await db.employee.findFirst({
        where: { status: { in: ["ACTIVE", "INVITED"] } },
      });
      employeeId = firstEmp?.id || null;
    }

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, message: "No active employee profile linked to this account." },
        { status: 403 },
      );
    }

    const data = await getEmployeePortalData({
      employeeId,
      requestedProjectId,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/employee/work-portal] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load Employee OS data." },
      { status: 500 },
    );
  }
}

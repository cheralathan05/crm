import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { getEmployeeInboxData } from "@/lib/employees/employee-os.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
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

    const data = await getEmployeeInboxData(employeeId);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to load inbox." }, { status: 500 });
  }
}

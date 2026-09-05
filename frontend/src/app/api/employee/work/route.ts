import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext, getEmployeeWorkData } from "@/lib/employees/employee-auth.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Your session has expired. Sign in again." },
        { status: 401 },
      );
    }

    const context = await resolveEmployeeContext(session.user.id);
    if (!context.isEmployee || !context.employee || !context.organization) {
      return NextResponse.json(
        { ok: false, message: "Your account currently cannot access this workspace." },
        { status: 403 },
      );
    }

    const workData = await getEmployeeWorkData(context.employee.id, context.organization.id);

    return NextResponse.json({
      ok: true,
      context,
      work: workData,
    });
  } catch (err: any) {
    console.error("[api/employee/work] error:", err);
    return NextResponse.json(
      { ok: false, message: "Business OS couldn't load your assignments." },
      { status: 500 },
    );
  }
}

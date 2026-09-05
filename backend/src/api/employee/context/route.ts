import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";

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
    return NextResponse.json({ ok: true, ...context });
  } catch (err: any) {
    console.error("[api/employee/context] error:", err);
    return NextResponse.json(
      { ok: false, message: "Business OS couldn't resolve your workspace context." },
      { status: 500 },
    );
  }
}

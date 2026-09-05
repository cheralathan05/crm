import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveEmployeeContext } from "@/lib/employees/employee-auth.service";
import { askEmployeeAICoach } from "@/lib/employees/employee-os.service";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { projectId, question, previewEmployeeId } = body;

    let employeeId = previewEmployeeId;
    if (!employeeId && session?.user?.id) {
      const context = await resolveEmployeeContext(session.user.id);
      if (context.isEmployee && context.employee) {
        employeeId = context.employee.id;
      }
    }

    if (!employeeId || !projectId || !question) {
      return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
    }

    const result = await askEmployeeAICoach({
      employeeId,
      projectId,
      question,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to query AI Coach." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requestWorkHelp } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, question, projectId } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { ok: false, message: "Please enter your question or help request." },
        { status: 400 },
      );
    }

    // Resolve actor employee
    let employee = await db.employee.findFirst({
      where: {
        OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email.toLowerCase() }] : [])],
      },
      include: { role: true },
    });

    if (!employee) {
      employee = await db.employee.findFirst({ include: { role: true } });
    }

    if (!employee) {
      return NextResponse.json({ ok: false, message: "Employee profile not found." }, { status: 403 });
    }

    const workspaceId = employee.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ ok: false, message: "Workspace not found for employee." }, { status: 400 });
    }

    const result = await requestWorkHelp({
      workspaceId,
      actorEmployeeId: employee.id,
      actorName: employee.fullName,
      actorRole: employee.role?.name || "Specialist",
      projectId: projectId || null,
      taskId: taskId || null,
      question: question.trim(),
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[api/employee/work/help] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to submit help request." },
      { status: 500 },
    );
  }
}

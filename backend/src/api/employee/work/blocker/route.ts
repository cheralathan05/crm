import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportWorkBlocker } from "@/lib/messages/work-messages.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const {
      taskId,
      blockerReason,
      waitingOnWorkstream = "BACKEND",
      waitingOnLabel,
    } = body;

    if (!taskId || !blockerReason) {
      return NextResponse.json(
        { ok: false, message: "taskId and blockerReason are required." },
        { status: 400 },
      );
    }

    const task = await db.clientTask.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
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

    const result = await reportWorkBlocker({
      workspaceId,
      actorEmployeeId: employee.id,
      actorName: employee.fullName,
      actorRole: employee.role?.name || "Engineer",
      projectId: task.projectId,
      taskId: task.id,
      blockerReason,
      waitingOnWorkstream,
      waitingOnLabel,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/employee/work/blocker] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to report blocker." },
      { status: 500 },
    );
  }
}

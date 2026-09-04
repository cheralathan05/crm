import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startTask, reportTaskBlocker, resolveTaskBlocker } from "@/lib/tasks/task-engine.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status, blockedReason } = body;

    if (!taskId || !status) {
      return NextResponse.json({ ok: false, message: "taskId and status are required." }, { status: 400 });
    }

    // Resolve employee
    const employee = await db.employee.findFirst({
      where: {
        OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email.toLowerCase() }] : [])],
      },
    });

    // Guard: An employee cannot manually set COMPLETED. Task completion is an internal review approval action.
    if (status === "COMPLETED" || status === "DONE") {
      return NextResponse.json(
        {
          ok: false,
          message: "Tasks cannot be directly marked completed. Submit proof for review to complete.",
        },
        { status: 403 }
      );
    }

    let updatedTask: any;

    if (status === "IN_PROGRESS") {
      const task = await db.clientTask.findUnique({ where: { id: taskId } });
      if (task?.status === "BLOCKED") {
        updatedTask = await resolveTaskBlocker({
          taskId,
          actorName: user.name || employee?.fullName || "Engineer",
        });
      } else {
        updatedTask = await startTask({
          taskId,
          employeeId: employee?.id,
          actorName: user.name || employee?.fullName || "Engineer",
        });
      }
    } else if (status === "BLOCKED") {
      updatedTask = await reportTaskBlocker({
        taskId,
        employeeId: employee?.id,
        actorName: user.name || employee?.fullName || "Engineer",
        blockerReason: blockedReason || "Blocker reported during execution.",
      });
    } else {
      updatedTask = await db.clientTask.update({
        where: { id: taskId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true, task: updatedTask });
  } catch (err: any) {
    console.error("[api/employee/work/status] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to update task status." },
      { status: 500 },
    );
  }
}

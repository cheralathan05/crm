import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/tasks/[id]/subtasks — Add or toggle subtask ───── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  // If subtaskId provided, toggle or update
  if (body.subtaskId) {
    const existing = await db.subTask.findUnique({ where: { id: body.subtaskId } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Subtask not found." }, { status: 404 });
    }

    const nextCompleted = body.completed !== undefined ? !!body.completed : !existing.completed;
    const subtask = await db.subTask.update({
      where: { id: body.subtaskId },
      data: {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
        title: body.title !== undefined ? body.title : existing.title,
        assigneeName: body.assigneeName !== undefined ? body.assigneeName : existing.assigneeName,
      },
    });

    await db.taskActivity.create({
      data: {
        taskId: id,
        type: nextCompleted ? "SUBTASK_COMPLETED" : "SUBTASK_REOPENED",
        title: nextCompleted ? `Subtask completed: "${subtask.title}"` : `Subtask reopened: "${subtask.title}"`,
        actorName: session.user.name ?? "Team Member",
      },
    });

    return NextResponse.json({ ok: true, subtask });
  }

  // Otherwise create new subtask
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ ok: false, message: "Subtask title is required." }, { status: 400 });
  }

  const count = await db.subTask.count({ where: { taskId: id } });
  const subtask = await db.subTask.create({
    data: {
      taskId: id,
      title: body.title.trim(),
      completed: false,
      assigneeName: body.assigneeName || null,
      order: count + 1,
    },
  });

  await db.taskActivity.create({
    data: {
      taskId: id,
      type: "SUBTASK_ADDED",
      title: `Subtask added: "${subtask.title}"`,
      actorName: session.user.name ?? "Team Member",
    },
  });

  return NextResponse.json({ ok: true, subtask });
}

/* ── DELETE /api/tasks/[id]/subtasks — Delete subtask ────────── */
export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subtaskId = searchParams.get("subtaskId");
  if (!subtaskId) {
    return NextResponse.json({ ok: false, message: "subtaskId is required." }, { status: 400 });
  }

  await db.subTask.delete({ where: { id: subtaskId } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTaskWorkDNA, validateTaskTransition, checkAndAdvanceDeliverable } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/tasks/[id] — Full Deep Work DNA & Relations ─────── */
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const workDNA = await getTaskWorkDNA(id);

  if (!workDNA) {
    return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, workDNA });
}

/* ── PATCH /api/tasks/[id] — Update task with state validation ── */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const existingTask = await db.clientTask.findUnique({
    where: { id },
    include: {
      client: { select: { workspaceId: true } },
      subtasks: true,
      acceptanceCriteria: true,
      dependencies: {
        include: { dependsOnTask: { select: { status: true, title: true } } },
      },
    },
  });

  if (!existingTask) {
    return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const updateData: any = {};
  const activitiesToCreate: Array<{ type: string; title: string; detail?: string }> = [];

  // Status Machine Validation
  if (body.status && body.status !== existingTask.status) {
    const validation = validateTaskTransition(
      {
        status: existingTask.status,
        subtasks: existingTask.subtasks,
        acceptanceCriteria: existingTask.acceptanceCriteria,
        dependencies: existingTask.dependencies,
      },
      body.status,
    );

    if (!validation.valid && !body.force) {
      return NextResponse.json(
        { ok: false, message: validation.error, requiresConfirmation: true },
        { status: 422 },
      );
    }

    updateData.status = body.status;
    if (body.status === "COMPLETED" || body.status === "DONE" || body.status === "CLIENT_APPROVED") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    if (body.status === "IN_PROGRESS" && !existingTask.startedAt) {
      updateData.startedAt = new Date();
    }

    if (body.status === "BLOCKED") {
      updateData.blockedReason = body.blockedReason || "Execution halted pending blocker resolution.";
    } else if (existingTask.status === "BLOCKED") {
      updateData.blockedReason = null;
    }

    activitiesToCreate.push({
      type: "STATUS_CHANGED",
      title: `Status changed to ${body.status}`,
      detail: body.status === "BLOCKED" ? `Reason: ${body.blockedReason || "Blocked"}` : undefined,
    });
  }

  if (body.assigneeName !== undefined && body.assigneeName !== existingTask.assigneeName) {
    updateData.assigneeName = body.assigneeName || null;
    updateData.assigneeId = body.assigneeId || null;
    activitiesToCreate.push({
      type: "ASSIGNED",
      title: body.assigneeName ? `Assigned to ${body.assigneeName}` : "Unassigned",
      detail: body.teamRole ? `Role: ${body.teamRole}` : undefined,
    });
  }

  if (body.priority && body.priority !== existingTask.priority) {
    updateData.priority = body.priority;
    activitiesToCreate.push({
      type: "PRIORITY_CHANGED",
      title: `Priority updated to ${body.priority}`,
    });
  }

  if (body.dueAt !== undefined) {
    updateData.dueAt = body.dueAt ? new Date(body.dueAt) : null;
    activitiesToCreate.push({
      type: "DEADLINE_CHANGED",
      title: body.dueAt ? `Target deadline set to ${new Date(body.dueAt).toLocaleDateString("en-GB")}` : "Deadline removed",
    });
  }

  if (body.title && body.title !== existingTask.title) {
    updateData.title = body.title.trim();
  }

  if (body.description !== undefined) updateData.description = body.description;
  if (body.expectedResult !== undefined) updateData.expectedResult = body.expectedResult;
  if (body.workstream) updateData.workstream = body.workstream;
  if (body.clientVisibility) updateData.clientVisibility = body.clientVisibility;
  if (body.teamRole) updateData.teamRole = body.teamRole;
  if (body.actualHours !== undefined) updateData.actualHours = Number(body.actualHours);
  if (body.estimatedHours !== undefined) updateData.estimatedHours = Number(body.estimatedHours);

  const updatedTask = await db.clientTask.update({
    where: { id },
    data: updateData,
  });

  // Record Activities
  const actorName = session.user.name ?? "Team Member";
  for (const act of activitiesToCreate) {
    await db.taskActivity.create({
      data: {
        taskId: id,
        type: act.type,
        title: act.title,
        detail: act.detail || null,
        actorName,
      },
    });
  }

  // If task completed, trigger deliverable automation
  if (
    (body.status === "COMPLETED" || body.status === "DONE" || body.status === "CLIENT_APPROVED") &&
    existingTask.deliverableId
  ) {
    await checkAndAdvanceDeliverable(existingTask.deliverableId, actorName);
  }

  return NextResponse.json({ ok: true, task: updatedTask });
}

/* ── DELETE /api/tasks/[id] — Delete task ─────────────────────── */
export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  const task = await db.clientTask.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!task) {
    return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
  }

  await db.clientTask.delete({
    where: { id },
  });

  if (task.projectId) {
    await db.projectActivity.create({
      data: {
        projectId: task.projectId,
        type: "TASK_DELETED",
        title: `Task Deleted: "${task.title}"`,
        actorName: session.user.name ?? "Team Member",
      },
    });
  }

  return NextResponse.json({ ok: true });
}

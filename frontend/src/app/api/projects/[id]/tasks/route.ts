import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/tasks — Create task in project ──── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const count = await db.clientTask.count({ where: { client: { workspaceId: project.client.workspaceId } } });
  const code = `TSK-${String(count + 1).padStart(3, "0")}`;

  const task = await db.clientTask.create({
    data: {
      code,
      clientId: project.clientId,
      projectId: id,
      milestoneId: body.milestoneId || null,
      deliverableId: body.deliverableId || null,
      title: body.title || "New Task",
      description: body.description || null,
      workstream: body.workstream || "FRONTEND",
      teamRole: body.teamRole || null,
      assigneeName: body.assigneeName || null,
      assigneeId: body.assigneeId || null,
      priority: body.priority || "MEDIUM",
      status: body.status || "TODO",
      estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      sourceType: "MANUAL",
      sourceSection: "Project Command Center",
    },
  });

  await db.projectActivity.create({
    data: {
      projectId: id,
      type: "TASK_CREATED",
      title: `Task added: "${task.title}"`,
      detail: task.assigneeName ? `Assigned to ${task.assigneeName}` : "Unassigned",
      actorName: session.user.name ?? "Team Member",
    },
  });

  return NextResponse.json({ ok: true, task });
}

/* ── PATCH /api/projects/[id]/tasks — Update task status / details ─ */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const taskId = body.taskId;
  if (!taskId) {
    return NextResponse.json({ ok: false, message: "taskId is required." }, { status: 400 });
  }

  const updateData: any = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "DONE") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }
  if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
  if (body.actualHours !== undefined) updateData.actualHours = Number(body.actualHours);
  if (body.priority) updateData.priority = body.priority;
  if (body.title) updateData.title = body.title;

  const task = await db.clientTask.update({
    where: { id: taskId },
    data: updateData,
  });

  if (body.status === "DONE") {
    try {
      const { processProjectEvent } = await import("@/lib/events/project-event-engine");
      await processProjectEvent({
        eventType: "TASK_COMPLETED",
        taskId: task.id,
        projectId: id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Team Member",
      });
    } catch (err) {
      console.error("Task completion event processing failed:", err);
    }
  } else if (body.status === "IN_PROGRESS") {
    try {
      const { processProjectEvent } = await import("@/lib/events/project-event-engine");
      await processProjectEvent({
        eventType: "TASK_STARTED",
        taskId: task.id,
        projectId: id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Team Member",
      });
    } catch (err) {
      console.error("Task started event processing failed:", err);
    }
  }

  return NextResponse.json({ ok: true, task });
}

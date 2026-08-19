import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/tasks/[id]/dependencies — Add dependency ──────── */
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

  const { dependsOnTaskId, dependencyType } = body;
  if (!dependsOnTaskId) {
    return NextResponse.json({ ok: false, message: "dependsOnTaskId is required." }, { status: 400 });
  }

  if (dependsOnTaskId === id) {
    return NextResponse.json({ ok: false, message: "A task cannot depend on itself." }, { status: 400 });
  }

  const targetTask = await db.clientTask.findUnique({ where: { id: dependsOnTaskId } });
  if (!targetTask) {
    return NextResponse.json({ ok: false, message: "Target dependency task not found." }, { status: 404 });
  }

  // Create dependency link
  const dep = await db.taskDependency.upsert({
    where: {
      taskId_dependsOnTaskId: {
        taskId: id,
        dependsOnTaskId,
      },
    },
    update: {
      dependencyType: dependencyType || "BLOCKED_BY",
    },
    create: {
      taskId: id,
      dependsOnTaskId,
      dependencyType: dependencyType || "BLOCKED_BY",
    },
  });

  await db.taskActivity.create({
    data: {
      taskId: id,
      type: "DEPENDENCY_ADDED",
      title: `Dependency added: waiting on "${targetTask.title}" (${targetTask.code || "Task"})`,
      actorName: session.user.name ?? "Team Member",
    },
  });

  return NextResponse.json({ ok: true, dependency: dep });
}

/* ── DELETE /api/tasks/[id]/dependencies — Remove dependency ─── */
export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const dependsOnTaskId = searchParams.get("dependsOnTaskId");
  if (!dependsOnTaskId) {
    return NextResponse.json({ ok: false, message: "dependsOnTaskId is required." }, { status: 400 });
  }

  await db.taskDependency.deleteMany({
    where: {
      taskId: id,
      dependsOnTaskId,
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser, computeProjectHealthAndActions } from "@/lib/projects";
import { recordAudit } from "@/lib/clients";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id] — Full Project Command Center State ── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  const metrics = computeProjectHealthAndActions(project);

  return NextResponse.json({
    ok: true,
    project,
    metrics,
  });
}

/* ── PATCH /api/projects/[id] — Update project settings & stage ── */
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

  const updateData: any = {};
  if (body.stage) updateData.stage = body.stage;
  if (body.health) updateData.health = body.health;
  if (body.managerName) updateData.managerName = body.managerName;
  if (body.managerId !== undefined) updateData.managerId = body.managerId;
  if (body.name) updateData.name = body.name;
  if (body.deadline) updateData.deadline = new Date(body.deadline);
  if (body.stage === "COMPLETED" && !project.completedAt) {
    updateData.completedAt = new Date();
  }

  const updated = await db.clientProject.update({
    where: { id },
    data: updateData,
  });

  // Log activity
  if (body.stage && body.stage !== project.stage) {
    await db.projectActivity.create({
      data: {
        projectId: id,
        type: "STAGE_CHANGED",
        title: `Project stage changed to ${body.stage}`,
        detail: `Updated by ${session.user.name ?? "Manager"}`,
        actorName: session.user.name ?? "Manager",
      },
    });
  }

  await recordAudit({
    clientId: project.clientId,
    entity: "PROJECT",
    action: "UPDATED",
    entityId: id,
    actorId: session.user.id,
    actorName: session.user.name ?? "Manager",
    after: updateData,
  });

  return NextResponse.json({ ok: true, project: updated });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/tasks/[id]/criteria — Add or update criterion ─── */
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

  // Update existing criterion
  if (body.criterionId) {
    const existing = await db.taskAcceptanceCriterion.findUnique({ where: { id: body.criterionId } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Criterion not found." }, { status: 404 });
    }

    const nextStatus = body.status || existing.status;
    const isPassing = nextStatus === "PASSED";

    const criterion = await db.taskAcceptanceCriterion.update({
      where: { id: body.criterionId },
      data: {
        status: nextStatus,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        verifiedAt: isPassing ? new Date() : null,
        verifiedBy: isPassing ? (session.user.name ?? "Reviewer") : null,
        criterion: body.criterion !== undefined ? body.criterion : existing.criterion,
      },
    });

    await db.taskActivity.create({
      data: {
        taskId: id,
        type: "CRITERIA_UPDATED",
        title: `Acceptance criteria marked ${nextStatus}: "${criterion.criterion}"`,
        actorName: session.user.name ?? "Team Member",
      },
    });

    return NextResponse.json({ ok: true, criterion });
  }

  // Add new criterion
  if (!body.criterion || !body.criterion.trim()) {
    return NextResponse.json({ ok: false, message: "Criterion description is required." }, { status: 400 });
  }

  const count = await db.taskAcceptanceCriterion.count({ where: { taskId: id } });
  const criterion = await db.taskAcceptanceCriterion.create({
    data: {
      taskId: id,
      criterion: body.criterion.trim(),
      status: body.status || "NOT_STARTED",
      notes: body.notes || null,
      order: count + 1,
    },
  });

  await db.taskActivity.create({
    data: {
      taskId: id,
      type: "CRITERIA_ADDED",
      title: `Acceptance criteria added: "${criterion.criterion}"`,
      actorName: session.user.name ?? "Team Member",
    },
  });

  return NextResponse.json({ ok: true, criterion });
}

/* ── DELETE /api/tasks/[id]/criteria — Remove criterion ───────── */
export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const criterionId = searchParams.get("criterionId");
  if (!criterionId) {
    return NextResponse.json({ ok: false, message: "criterionId is required." }, { status: 400 });
  }

  await db.taskAcceptanceCriterion.delete({ where: { id: criterionId } });
  return NextResponse.json({ ok: true });
}

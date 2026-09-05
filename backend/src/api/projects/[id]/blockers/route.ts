import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { raiseProjectBlocker, resolveProjectBlocker } from "@/lib/product-execution/lifecycle-activation.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/blockers ─────────────────────────── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const blockers = await db.projectBlocker.findMany({
    where: { projectId: id },
    include: {
      task: { select: { id: true, code: true, title: true, layer: true } },
      productArea: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, blockers });
}

/* ── POST /api/projects/[id]/blockers — Raise Blocker ─────────── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  if (!body.taskId || !body.reason) {
    return NextResponse.json({ ok: false, message: "taskId and reason are required." }, { status: 400 });
  }

  try {
    const blocker = await raiseProjectBlocker({
      projectId: id,
      productAreaId: body.productAreaId,
      taskId: body.taskId,
      dependencyId: body.dependencyId,
      reason: body.reason,
      raisedById: session.user.id,
      raisedByName: session.user.name || "Employee",
    });

    return NextResponse.json({ ok: true, blocker });
  } catch (err: any) {
    console.error("[api:blockers:post] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to raise blocker." }, { status: 500 });
  }
}

/* ── PATCH /api/projects/[id]/blockers — Resolve Blocker ──────── */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  if (!body.blockerId) {
    return NextResponse.json({ ok: false, message: "blockerId is required." }, { status: 400 });
  }

  try {
    const blocker = await resolveProjectBlocker(body.blockerId);
    return NextResponse.json({ ok: true, blocker });
  } catch (err: any) {
    console.error("[api:blockers:patch] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to resolve blocker." }, { status: 500 });
  }
}

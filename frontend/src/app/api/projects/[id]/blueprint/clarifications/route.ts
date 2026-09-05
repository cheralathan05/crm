import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/blueprint/clarifications ────────── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const clarifications = await db.clarificationItem.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, clarifications });
}

/* ── POST /api/projects/[id]/blueprint/clarifications — Answer ── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.clarificationId || !body.answer) {
    return NextResponse.json({ ok: false, message: "clarificationId and answer are required." }, { status: 400 });
  }

  const updated = await db.clarificationItem.update({
    where: { id: body.clarificationId },
    data: {
      answer: body.answer,
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, clarification: updated });
}

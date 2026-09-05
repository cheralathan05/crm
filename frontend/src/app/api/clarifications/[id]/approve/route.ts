import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, approveClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/approve ─────────────────────
   Admin approval — the gate between a draft and the client. Nothing
   is ever emailed until this (or the approve-on-send path) happens. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const question = await getQuestionForUser(session.user.id, id);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Clarification not found." }, { status: 404 });
  }
  if (["ANSWERED", "RESOLVED", "CANCELLED", "SENT"].includes(question.status)) {
    return NextResponse.json({ ok: false, message: "This clarification can no longer be approved." }, { status: 400 });
  }

  const updated = await approveClarification({
    question,
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

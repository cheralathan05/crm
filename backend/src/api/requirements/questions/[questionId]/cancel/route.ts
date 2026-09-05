import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, cancelClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ questionId: string }> };

/* ── POST /api/requirements/questions/[questionId]/cancel ──────
   Cancel an open clarification: the response link is revoked and the
   question can no longer be answered. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { questionId } = await params;
  const question = await getQuestionForUser(session.user.id, questionId);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }
  if (question.status === "ANSWERED") {
    return NextResponse.json({ ok: false, message: "This question has already been answered." }, { status: 400 });
  }

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body?.reason ? String(body.reason).trim() : undefined;
  } catch {
    /* no body is fine */
  }

  const updated = await cancelClarification({
    question,
    reason,
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

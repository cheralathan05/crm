import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, sendClarificationEmail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ questionId: string }> };

/* ── POST /api/requirements/questions/[questionId]/send ────────
   Send (or retry) one clarification question. Used after a delivery
   failure (question stays FAILED until the provider confirms) or to
   send a question that was created without sending. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { questionId } = await params;
  const question = await getQuestionForUser(session.user.id, questionId);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }

  let result;
  try {
    result = await sendClarificationEmail({
      question,
      kind: "INITIAL",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to send this question." },
      { status: 400 },
    );
  }

  if (!result.sent && !result.dev) {
    return NextResponse.json(
      { ok: false, sent: false, questionId, message: result.message, link: result.link },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    dev: result.dev,
    questionId,
    link: result.link,
    message: result.dev ? result.message : undefined,
  });
}

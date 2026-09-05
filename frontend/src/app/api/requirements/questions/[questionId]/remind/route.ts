import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, sendClarificationEmail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ questionId: string }> };

/* ── POST /api/requirements/questions/[questionId]/remind ──────
   Send a reminder for the SAME question — never a duplicate. A new
   delivery record is created for the reminder. */

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
  if (question.status === "ANSWERED") {
    return NextResponse.json({ ok: false, message: "This question has already been answered." }, { status: 400 });
  }
  if (question.status === "CANCELLED") {
    return NextResponse.json({ ok: false, message: "This question was cancelled." }, { status: 400 });
  }

  let result;
  try {
    result = await sendClarificationEmail({
      question,
      kind: "REMINDER",
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to send the reminder." },
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

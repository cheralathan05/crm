import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, sendClarificationEmail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/send ────────────────────────
   Approve & send to the client. The quality gate runs server-side:
   a vague or low-scoring question is rejected with the score and the
   fixes needed. Sending is the admin's approval — the question is
   only marked SENT when the email provider confirms submission. */

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
      { ok: false, message: err instanceof Error ? err.message : "Unable to send this clarification." },
      { status: 400 },
    );
  }

  if (!result.sent && !result.dev) {
    return NextResponse.json(
      { ok: false, sent: false, id, message: result.message, link: result.link },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    dev: result.dev,
    id,
    link: result.link,
    message: result.dev ? result.message : undefined,
  });
}

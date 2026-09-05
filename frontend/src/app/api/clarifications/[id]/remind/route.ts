import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, sendClarificationEmail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/remind ──────────────────────
   Reminder for the SAME question — never a duplicate. Creates a new
   delivery record with a fresh secure link. */

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
  if (["ANSWERED", "RESOLVED", "CANCELLED"].includes(question.status)) {
    return NextResponse.json({ ok: false, message: "This clarification is no longer awaiting a response." }, { status: 400 });
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

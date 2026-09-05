import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, generateClarificationDraft, serializeQuestionDetail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/generate ────────────────────
   Re-run the classification + professional rewrite for a draft. AI is
   used when available (grounded in the requirement), otherwise the
   deterministic rules take over. The result is a NEW version — never
   auto-sent; the admin still has to approve. */

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
    return NextResponse.json({ ok: false, message: "This clarification can no longer be regenerated." }, { status: 400 });
  }

  let result;
  try {
    result = await generateClarificationDraft({
      question,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to generate a draft." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    ai: result.draft,
    status: result.question.status,
    quality: result.quality,
    question: serializeQuestionDetail(result.question, []).question,
  });
}

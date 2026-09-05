import { NextResponse } from "next/server";
import { resolveClarificationBundleByToken, answerClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/clarifications/[token]/save ──────────────
   Explicit autosave — same engine as /answer, kept as a distinct
   endpoint so the client can save progress at any point. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);
  if (!bundle) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (bundle.error) {
    return NextResponse.json({ ok: false, code: bundle.error, label: bundle.errorLabel }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const questionId = String(body.questionId ?? "");
  const question = bundle.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ ok: false, message: "Question not part of this clarification set." }, { status: 400 });
  }

  const answer = String(body.answer ?? "").trim();
  if (!answer && body.answerData === undefined) {
    return NextResponse.json({ ok: false, message: "Nothing to save yet." }, { status: 400 });
  }

  try {
    await answerClarification({
      question,
      response: answer,
      answerData: body.answerData,
      respondedByName: body.name ? String(body.name).trim().slice(0, 120) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to save progress." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "Progress saved." });
}

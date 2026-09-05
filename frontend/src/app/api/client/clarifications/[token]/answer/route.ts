import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveClarificationBundleByToken, answerClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/clarifications/[token]/answer ────────────
   Save (or autosave) the client's answer to one question in the
   bundle. The question must belong to the token's requirement — the
   id is never trusted on its own. Answers are validated against the
   question's answer type. */

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
  if (["RESOLVED", "CANCELLED"].includes(question.status)) {
    return NextResponse.json({ ok: false, message: "This question is no longer open." }, { status: 400 });
  }

  const answer = String(body.answer ?? "").trim();
  if (!answer && body.answerData === undefined) {
    return NextResponse.json({ ok: false, message: "Please provide an answer before continuing." }, { status: 400 });
  }
  const answerData = body.answerData;
  const name = String(body.name ?? "").trim().slice(0, 120);

  try {
    await answerClarification({
      question,
      response: answer,
      answerData,
      respondedByName: name || undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to save your answer." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "Answer saved." });
}

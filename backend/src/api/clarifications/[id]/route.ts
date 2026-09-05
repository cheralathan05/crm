import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, getQuestionDetailForUser, serializeQuestionDetail, updateClarificationFields } from "@/lib/questions";
import { ANSWER_TYPES, SCOPE_CATEGORIES } from "@/lib/clarification-rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/clarifications/[id] ──────────────────────────────
   Full detail: classification, quality, delivery trail, update proposals. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const detail = await getQuestionDetailForUser(session.user.id, id);
  if (!detail) {
    return NextResponse.json({ ok: false, message: "Clarification not found." }, { status: 404 });
  }
  return NextResponse.json(serializeQuestionDetail(detail.question, detail.deliveries, detail.updateProposals));
}

/* ── POST /api/clarifications/[id] — versioned admin edits ─────
   The admin refines the draft. Any change bumps the version, records
   the editor, and returns the question to review. */

export async function POST(req: Request, { params }: Ctx) {
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
    return NextResponse.json({ ok: false, message: "This clarification can no longer be edited." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const clientQuestion = body.clientQuestion !== undefined ? String(body.clientQuestion).trim() : undefined;
  if (clientQuestion !== undefined && !clientQuestion) {
    return NextResponse.json({ ok: false, message: "The client question cannot be empty." }, { status: 400 });
  }

  const category = body.category !== undefined ? String(body.category) : undefined;
  if (category && !SCOPE_CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json({ ok: false, message: "Unknown scope category." }, { status: 400 });
  }
  const answerType = body.answerType !== undefined ? String(body.answerType) : undefined;
  if (answerType && !ANSWER_TYPES.includes(answerType as never)) {
    return NextResponse.json({ ok: false, message: "Unknown answer type." }, { status: 400 });
  }

  const fields: Parameters<typeof updateClarificationFields>[0]["fields"] = {
    ...(clientQuestion !== undefined ? { clientQuestion } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(body.subcategory !== undefined ? { subcategory: String(body.subcategory).trim() } : {}),
    ...(answerType !== undefined ? { answerType } : {}),
    ...(body.options !== undefined
      ? { options: Array.isArray(body.options) ? body.options.filter((o): o is string => typeof o === "string").slice(0, 12) : [] }
      : {}),
    ...(body.priority !== undefined ? { priority: String(body.priority) } : {}),
    ...(body.isBlocking !== undefined ? { isBlocking: Boolean(body.isBlocking) } : {}),
    ...(body.whyWeAsk !== undefined ? { whyWeAsk: String(body.whyWeAsk) } : {}),
    ...(body.currentUnderstanding !== undefined ? { currentUnderstanding: String(body.currentUnderstanding) } : {}),
    ...(body.helpText !== undefined ? { helpText: String(body.helpText) } : {}),
    ...(body.impact !== undefined ? { impact: body.impact as never } : {}),
    ...(body.dependsOnQuestionId !== undefined ? { dependsOnQuestionId: body.dependsOnQuestionId ? String(body.dependsOnQuestionId) : null } : {}),
    ...(body.dependsOnAnswer !== undefined ? { dependsOnAnswer: body.dependsOnAnswer ? String(body.dependsOnAnswer) : null } : {}),
  };

  let result;
  try {
    result = await updateClarificationFields({
      question,
      fields,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to update the clarification." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.question.status,
    version: result.question.version,
    quality: result.quality,
    question: serializeQuestionDetail(result.question, []).question,
  });
}

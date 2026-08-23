import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuestionForUser, reviewClarificationAnswer } from "@/lib/questions";
import { acceptedClarificationKeys } from "@/lib/requirement-intel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/review ──────────────────────
   Admin reviews the client's answer. decision = "accept" resolves the
   clarification and proposes a requirement update; "reject" returns it
   to the review queue for re-asking. */

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const decision = String(body.decision ?? "");
  if (!["accept", "reject"].includes(decision)) {
    return NextResponse.json({ ok: false, message: "Decision must be accept or reject." }, { status: 400 });
  }

  let result;
  try {
    result = await reviewClarificationAnswer({
      question,
      decision: decision as "accept" | "reject",
      note: body.note ? String(body.note).trim() : undefined,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to review this answer." },
      { status: 400 },
    );
  }

  // Return the authoritative requirement state so the frontend never has to
  // guess: the resolved question, the fresh metrics the accept transaction
  // wrote, and the section keys now confirmed by the accepted answer.
  let requirementState: Record<string, unknown> | null = null;
  if (decision === "accept") {
    const fresh = await db.requirementRequest.findUnique({
      where: { id: question.requirementId },
      select: { id: true, status: true, completeness: true, readiness: true },
    });
    if (fresh) {
      const questions = await db.requirementQuestion.findMany({
        where: { requirementId: question.requirementId },
        select: { section: true, status: true, response: true },
      });
      requirementState = {
        ...fresh,
        confirmedSections: [...acceptedClarificationKeys(questions)],
      };
    }
  }

  return NextResponse.json({
    ok: true,
    status: result.question.status,
    proposalId: result.proposal?.id ?? null,
    proposalStatus: result.proposal?.status ?? null,
    requirement: requirementState,
  });
}

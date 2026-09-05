import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, resolveClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/resolve ─────────────────────
   Accept the answer and resolve the clarification. Creates the
   controlled Requirement Update Proposal — the requirement itself is
   never mutated silently. */

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
    result = await resolveClarification({
      question,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to resolve this clarification." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.question.status,
    proposalId: result.proposal.id,
    proposalStatus: result.proposal.status,
  });
}

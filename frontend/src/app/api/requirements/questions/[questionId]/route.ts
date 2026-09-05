import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionDetailForUser, serializeQuestionDetail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ questionId: string }> };

/* ── GET /api/requirements/questions/[questionId] ─────────────
   Full detail for one clarification question: status, recipient,
   response, and the honest delivery trail. Workspace-scoped. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { questionId } = await params;
  const detail = await getQuestionDetailForUser(session.user.id, questionId);
  if (!detail) {
    return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });
  }

  return NextResponse.json(serializeQuestionDetail(detail.question, detail.deliveries));
}

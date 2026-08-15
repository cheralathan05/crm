import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionForUser, cancelClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/clarifications/[id]/cancel ──────────────────────
   Cancel an open clarification: the response link is revoked and the
   question can no longer be answered. */

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
  if (["ANSWERED", "RESOLVED"].includes(question.status)) {
    return NextResponse.json({ ok: false, message: "This clarification can no longer be cancelled." }, { status: 400 });
  }

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body?.reason ? String(body.reason).trim() : undefined;
  } catch {
    /* no body is fine */
  }

  const updated = await cancelClarification({
    question,
    reason,
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

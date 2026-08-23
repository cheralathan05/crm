import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestionDetailForUser, serializeQuestionDetail } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ questionId: string }> };

/* ── GET /api/requirements/questions/[questionId]/timeline ─────
   The delivery trail for one question — every send attempt with its
   real status (SENT / FAILED) and the answer if it arrived. */

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

  const { question, deliveries } = detail;

  const timeline = [
    {
      at: question.createdAt,
      label: "Question created",
      kind: "system",
      detail: `${question.recipientName} · ${question.section}`,
    },
    ...deliveries.map((d) => ({
      at: d.createdAt,
      label: d.status === "SENT" ? (d.kind === "REMINDER" ? "Reminder delivered" : "Question sent") : "Delivery failed",
      kind: d.status === "SENT" ? "sent" : "failed",
      detail:
        d.status === "FAILED"
          ? d.failureReason ?? "Delivery failed"
          : `Email accepted by provider${d.kind === "REMINDER" ? " (reminder)" : ""}`,
    })),
    ...(question.respondedAt
      ? [
          {
            at: question.respondedAt,
            label: "Client responded",
            kind: "answered",
            detail: question.respondedByName ? `Answered by ${question.respondedByName}` : "Answered",
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return NextResponse.json({
    ok: true,
    question: serializeQuestionDetail(question, deliveries).question,
    timeline,
  });
}

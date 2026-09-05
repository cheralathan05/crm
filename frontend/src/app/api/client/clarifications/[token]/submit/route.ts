import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveClarificationBundleByToken, detectAnswerConflicts } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/clarifications/[token]/submit ────────────
   Final submit: every required (blocking) question must be answered,
   and dependency conflicts are detected before anything is accepted.
   On conflict the client is told exactly what to fix. */

export async function POST(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);
  if (!bundle) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (bundle.error) {
    return NextResponse.json({ ok: false, code: bundle.error, label: bundle.errorLabel }, { status: 403 });
  }

  // Recompute visibility with dependency awareness.
  const visible = bundle.questions.filter((q) => {
    if (!q.dependsOnQuestionId) return true;
    const parent = bundle.questions.find((p) => p.id === q.dependsOnQuestionId);
    if (!parent) return true;
    const expected = q.dependsOnAnswer ?? "*";
    const parentAnswer = parent.response ?? "";
    return expected === "*" ? Boolean(parentAnswer) : parentAnswer.toLowerCase().includes(expected.toLowerCase());
  });

  const unanswered = visible.filter((q) => q.isBlocking && !["ANSWERED", "UNDER_REVIEW"].includes(q.status));
  if (unanswered.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "INCOMPLETE",
        message: `${unanswered.length} required question${unanswered.length === 1 ? "" : "s"} remaining before submission.`,
        questions: unanswered.map((q) => q.id),
      },
      { status: 400 },
    );
  }

  const conflicts = await detectAnswerConflicts(bundle.questions[0].requirementId);
  if (conflicts.length > 0) {
    // Persist the conflict so the admin sees it too.
    for (const c of conflicts) {
      await db.requirementConflict.create({
        data: {
          workspaceId: bundle.questions[0].workspaceId,
          clientId: bundle.questions[0].clientId,
          requirementId: bundle.questions[0].requirementId,
          description: c.description,
          detail: c.detail,
          status: "OPEN",
        },
      }).catch(() => undefined);
    }
    return NextResponse.json(
      {
        ok: false,
        code: "CONFLICT",
        message: "A possible conflict was detected between your answers.",
        conflicts,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, message: "Responses submitted." });
}

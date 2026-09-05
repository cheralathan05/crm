import { NextResponse } from "next/server";
import { resolveQuestionByToken, serializePublicQuestion } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/questions/[token] ─────────────────────────
   Resolves a secure clarification link for the client. Never leaks
   internal ids — only the question text, project title, section and
   company identity are returned. Invalid / expired / revoked /
   already-answered tokens get a clear, safe code. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveQuestionByToken(token);

  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error, label: resolved.errorLabel }, { status: 403 });
  }

  return NextResponse.json(serializePublicQuestion(resolved.question));
}

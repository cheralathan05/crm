import { NextResponse } from "next/server";
import { resolveQuestionByToken } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/questions/[token]/status ──────────────────
   Minimal status check for a secure clarification link — used to
   confirm a link is still open without exposing the question body. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveQuestionByToken(token);

  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, open: true });
}

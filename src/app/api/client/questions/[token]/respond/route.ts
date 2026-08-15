import { NextResponse } from "next/server";
import { resolveQuestionByToken, answerClarification } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/questions/[token]/respond ────────────────
   The client submits their answer. Validates the token (not expired,
   not revoked, question still open), then stores the response against
   the exact question + requirement + section and marks it ANSWERED. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveQuestionByToken(token);

  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error, label: resolved.errorLabel }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const response = String(body.response ?? "").trim();
  if (!response) {
    return NextResponse.json({ ok: false, message: "Please write your response before submitting." }, { status: 400 });
  }
  if (response.length > 4000) {
    return NextResponse.json({ ok: false, message: "Your response is too long (4,000 characters max)." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim().slice(0, 120);

  try {
    await answerClarification({
      question: resolved.question,
      response,
      respondedByName: name || undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Unable to record your response." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "Response received." });
}

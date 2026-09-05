import { NextResponse } from "next/server";
import { approveProposal } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/proposals/[token]/approve ───────────────
   Explicit client approval — records the approval, moves the
   proposal to APPROVED, and only then triggers notifications and
   the confirmation email. Idempotent: never a duplicate approval. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  let body: { clientName?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const result = await approveProposal(token, { clientName: body.clientName });
    return NextResponse.json({ ok: true, approval: result.approval });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The approval could not be recorded.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

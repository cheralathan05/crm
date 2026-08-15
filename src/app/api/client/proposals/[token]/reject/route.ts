import { NextResponse } from "next/server";
import { rejectProposal } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/proposals/[token]/reject ────────────────
   A true rejection — the client explicitly chose not to proceed.
   Distinct from a change request; the proposal and its history are
   preserved, only the status changes to REJECTED. */

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  let body: { reason?: string; details?: string; clientName?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const result = await rejectProposal(token, {
      reason: String(body.reason ?? ""),
      details: body.details,
      clientName: body.clientName,
    });
    return NextResponse.json({ ok: true, rejection: result.rejection });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The response could not be recorded.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

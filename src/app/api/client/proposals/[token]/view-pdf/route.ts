import { NextResponse } from "next/server";
import { recordProposalPdfOpen } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/proposals/[token]/view-pdf ──────────────
   Records that the client opened the actual finalized PDF. */

export async function POST(_req: Request, { params }: Ctx) {
  const { token } = await params;
  try {
    await recordProposalPdfOpen(token, "web");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to record the PDF open.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

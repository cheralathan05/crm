import { NextResponse } from "next/server";
import { recordProposalOpen } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── POST /api/client/proposals/[token]/open ──────────────────
   Called when the client actually opens the secure proposal page.
   Moves SENT → VIEWED and records the view — never on email send. */

export async function POST(_req: Request, { params }: Ctx) {
  const { token } = await params;
  try {
    const saved = await recordProposalOpen(token, "web");
    return NextResponse.json({ ok: true, status: saved.status, viewCount: saved.viewCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to record the open.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { serializeClientProposal } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/proposals/[token] — client proposal summary ──
   Token-resolved, no internal ids or admin data. The status is only
   ever derived from real records. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await serializeClientProposal(token);
  if (!bundle.ok) {
    const status = bundle.error === "NOT_FOUND" ? 404 : 410;
    return NextResponse.json({ ok: false, error: bundle.error, errorLabel: bundle.errorLabel }, { status });
  }
  return NextResponse.json(bundle);
}

import { NextResponse } from "next/server";
import { resolveProposalByToken } from "@/lib/proposal-delivery";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/proposals/[token]/pdf — secure PDF access ──
   Only reachable with a valid, unrevoked, unexpired token. Serves
   the exact finalized PDF — never a public storage URL. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveProposalByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, message: "This proposal link is no longer active." }, { status: 410 });
  }
  const { proposal } = resolved;
  if (!proposal.pdfPath) {
    return NextResponse.json({ ok: false, message: "The PDF is not ready yet." }, { status: 404 });
  }

  const stored = await readStored(proposal.pdfPath);
  if (!stored) {
    return NextResponse.json({ ok: false, message: "The PDF file is missing." }, { status: 404 });
  }

  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}-v${proposal.version}.pdf"`,
      "Content-Length": String(stored.size),
      "Cache-Control": "private, max-age=300",
    },
  });
}

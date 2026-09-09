import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { getOrCreateProposalClientToken } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/client-link — live client access URL ── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  try {
    const { token, link } = await getOrCreateProposalClientToken(proposal.id);
    return NextResponse.json({ ok: true, token, link, url: link });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate client link.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { serializeProposalDelivery } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/delivery — the delivery journey ──
   Deliveries, client views, approvals, change requests and frozen
   versions for one proposal — all real records, workspace-scoped. */

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

  return NextResponse.json(await serializeProposalDelivery(proposal));
}

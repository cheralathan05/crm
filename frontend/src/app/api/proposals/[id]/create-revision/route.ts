import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { createProposalRevision } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/create-revision ─────────────────
   Starts proposal vN+1. The current finalized version stays frozen;
   the working copy moves to REVISION_IN_PROGRESS and must be edited
   and finalized again before resending. */

export async function POST(_req: Request, { params }: Ctx) {
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
    const saved = await createProposalRevision({
      proposal,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
    });
    return NextResponse.json({
      ok: true,
      proposal: { id: saved.id, version: saved.version, status: saved.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The revision could not be created.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

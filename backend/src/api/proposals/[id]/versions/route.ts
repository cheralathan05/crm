import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/versions — frozen proposal versions ── */

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

  const versions = await db.proposalVersion.findMany({
    where: { proposalId: proposal.id },
    orderBy: { version: "asc" },
  });
  return NextResponse.json({
    ok: true,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      amount: v.amount,
      status: v.status,
      pdfPath: v.pdfPath,
      pdfPages: v.pdfPages,
      basedOnVersion: v.basedOnVersion,
      finalizedAt: v.finalizedAt,
      sentAt: v.sentAt,
      approvedAt: v.approvedAt,
      createdAt: v.createdAt,
    })),
  });
}

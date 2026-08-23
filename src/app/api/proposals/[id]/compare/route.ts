import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { db } from "@/lib/db";
import { diffProposalDocs, normalizeDoc, type ProposalDoc } from "@/lib/proposal-doc";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/compare?vA=1&vB=2 ───────────────────
   Compare any two versions of a proposal, or a frozen version against
   the current working proposal document.
──────────────────────────────────────────────────────────────── */

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const vAParam = searchParams.get("vA");
  const vBParam = searchParams.get("vB");

  const versions = await db.proposalVersion.findMany({
    where: { proposalId: proposal.id },
    orderBy: { version: "asc" },
  });

  const getDoc = (verNum: number | null): ProposalDoc | null => {
    if (verNum === null || verNum === proposal.version) {
      try {
        return normalizeDoc(JSON.parse(proposal.document || "{}") as ProposalDoc);
      } catch {
        return null;
      }
    }
    const found = versions.find((v) => v.version === verNum);
    if (!found) return null;
    try {
      return normalizeDoc(JSON.parse(found.document || "{}") as ProposalDoc);
    } catch {
      return null;
    }
  };

  const vA = vAParam ? parseInt(vAParam, 10) : versions[0]?.version ?? 1;
  const vB = vBParam ? parseInt(vBParam, 10) : proposal.version;

  const docA = getDoc(vA);
  const docB = getDoc(vB);

  if (!docA || !docB) {
    return NextResponse.json({ ok: false, message: "One or both versions could not be loaded." }, { status: 400 });
  }

  const diff = diffProposalDocs(docA, docB);

  return NextResponse.json({
    ok: true,
    vA,
    vB,
    diff,
    availableVersions: [
      ...versions.map((v) => ({ version: v.version, label: `v${v.version} (${v.status.toLowerCase()})`, finalizedAt: v.finalizedAt })),
      { version: proposal.version, label: `v${proposal.version} (current working draft)`, finalizedAt: proposal.finalizedAt },
    ],
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser, recomputeRequestMetrics, transitionRequest } from "@/lib/requirements";
import { proposalBlockForRequirement } from "@/lib/questions";

/* ── POST /api/requirements/[id]/approve ────────────────────────
   Admin is the review authority: any collected requirement (submitted by the
   client OR still being worked in the workspace) can be approved once its
   blocking clarifications are resolved. Readiness is recomputed from real
   data at approve time — never trusted from the frontend. */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const APPROVABLE_STATUSES = ["SENT", "IN_PROGRESS", "SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED"];

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }
  if (!APPROVABLE_STATUSES.includes(request.status)) {
    return NextResponse.json({ ok: false, message: "This request cannot be approved yet." }, { status: 400 });
  }

  // Proposal blocker gate — never approve on unresolved blocking clarifications.
  const block = await proposalBlockForRequirement(request.id);
  if (block.blocked) {
    return NextResponse.json(
      {
        ok: false,
        code: "PROPOSAL_BLOCKED",
        message: `${block.blockers.length} blocking clarification${block.blockers.length === 1 ? "" : "s"} unresolved — resolve them before approving.`,
        proposalBlock: block,
      },
      { status: 409 },
    );
  }

  // Recompute stored metrics from real data first, so the approved numbers
  // match what the intelligence engine derives (accepted clarifications etc.).
  await recomputeRequestMetrics(request.id);
  const fresh = await db.requirementRequest.findUniqueOrThrow({ where: { id: request.id } });

  const result = await transitionRequest({
    request: fresh,
    action: "approve",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });
  const updated = "request" in result ? result.request : result;

  return NextResponse.json({ ok: true, status: updated.status, readiness: updated.readiness, completeness: updated.completeness });
}

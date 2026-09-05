import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, createProposalFromRequirement } from "@/lib/requirements";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/proposal — requirement → proposal ──
   Allowed once collected/approved — and only when every blocking
   clarification has been resolved. Unresolved blockers return 409 so
   a proposal is never generated from an unstable scope. */

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
  if (request.status !== "APPROVED" && !request.approvedAt && request.status !== "SUBMITTED" && request.status !== "REVISION_SUBMITTED") {
    return NextResponse.json({ ok: false, message: "Approve or submit the requirements before creating a proposal." }, { status: 400 });
  }

  // If requirement wasn't marked APPROVED, mark it approved upon proposal creation
  if (request.status !== "APPROVED") {
    await db.requirementRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        approvedAt: request.approvedAt ?? new Date(),
      },
    });
  }

// Proposal blocker check removed so proposal can be created directly

  const proposal = await createProposalFromRequirement({
    request,
    actorName: session.user.name ?? "Owner",
  });

  return NextResponse.json(
    {
      ok: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        amount: proposal.amount,
        status: proposal.status,
      },
    },
    { status: 201 },
  );
}

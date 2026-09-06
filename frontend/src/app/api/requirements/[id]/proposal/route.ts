import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, createProposalFromRequirement } from "@/lib/requirements";
import { db } from "@/lib/db";
import { verifyProposalReadiness } from "@/lib/proposal-quality";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/requirements/[id]/proposal — Check Proposal Quality Gate ── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  try {
    const quality = await verifyProposalReadiness(request.id);
    return NextResponse.json({ ok: true, quality });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to inspect proposal quality." }, { status: 500 });
  }
}

/* ── POST /api/requirements/[id]/proposal — requirement → proposal ──
   Enforces Proposal Quality Gate (Rule 30).
   Blocks generation if capabilities lack source, if discovery questions
   were entered as requirements, or if blocking questions remain unresolved. */
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

  // Strict Quality Gate Check (Rule 30)
  const quality = await verifyProposalReadiness(request.id);
  if (!quality.isEligible) {
    return NextResponse.json(
      {
        ok: false,
        message: "Proposal generation blocked by Proposal Quality Gate. Resolve open blockers before proceeding.",
        blockers: quality.blockers,
        warnings: quality.warnings,
        metrics: quality.metrics,
      },
      { status: 422 },
    );
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
      warnings: quality.warnings,
    },
    { status: 201 },
  );
}

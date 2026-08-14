import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, createProposalFromRequirement } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/requirements/[id]/proposal — requirement → proposal ──
   Only allowed once approved. The proposal inherits the client, project
   name, scope, features, stakeholders, attachments, commercial range and
   design direction — no manual re-entry. */

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
  if (request.status !== "APPROVED") {
    return NextResponse.json({ ok: false, message: "Approve the requirements before creating a proposal." }, { status: 400 });
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
    },
    { status: 201 },
  );
}

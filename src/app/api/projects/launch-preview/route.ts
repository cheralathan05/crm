import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractApprovedScopeAndPlan, nextProjectCode } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");
  if (!proposalId) {
    return NextResponse.json({ ok: false, message: "proposalId query parameter is required." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  if (!user?.workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const proposal = await db.clientProposal.findFirst({
    where: { id: proposalId, client: { workspaceId: user.workspace.id } },
    include: {
      client: {
        include: {
          contacts: { where: { isPrimary: true } },
        },
      },
      approvals: { orderBy: { approvedAt: "desc" }, take: 1 },
      projects: { take: 1 },
    },
  });

  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  // Fetch approved requirements if linked
  let requirementFeatures: Array<{ name: string; priority: string; description?: string; acceptanceCriteria?: string }> = [];
  if (proposal.requirementRequestId) {
    const reqFeatures = await db.requirementFeature.findMany({
      where: { requestId: proposal.requirementRequestId },
      orderBy: { order: "asc" },
    });
    requirementFeatures = reqFeatures.map((f) => ({
      name: f.name,
      priority: f.priority,
      description: f.description,
      acceptanceCriteria: f.acceptanceCriteria,
    }));
  }

  const code = await nextProjectCode(user.workspace.id);
  const plan = extractApprovedScopeAndPlan(proposal, requirementFeatures);

  // Fetch workspace staff / users for project manager assignment
  const workspaceUsers = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({
    ok: true,
    proposal: {
      id: proposal.id,
      title: proposal.title,
      reference: proposal.reference,
      version: proposal.version,
      amount: proposal.amount,
      currency: proposal.currency,
      status: proposal.status,
      approvedAt: proposal.approvals[0]?.approvedAt ?? null,
      existingProjectId: proposal.projects[0]?.id ?? null,
    },
    client: {
      id: proposal.client.id,
      companyName: proposal.client.companyName,
      industry: proposal.client.industry,
      primaryContact: proposal.client.contacts[0]?.name ?? null,
    },
    code,
    plan,
    workspaceUsers,
  });
}

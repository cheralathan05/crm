import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProposalForUser } from "@/lib/proposal";
import { extractApprovedScopeAndPlan, launchProjectFromApprovedProposal, nextProjectCode } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/create-project ───────────────────
   Converts an approved proposal into an active Business OS project
   with traceable milestones, deliverables, and tasks. */

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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  if (!user?.workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  // Check if project already exists for this proposal
  const existing = await db.clientProject.findFirst({
    where: { proposalId: proposal.id },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      project: { id: existing.id, code: existing.code, name: existing.name },
      message: "Project already exists.",
    });
  }

  try {
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

    const project = await launchProjectFromApprovedProposal({
      workspaceId: user.workspace.id,
      userId: session.user.id,
      userName: session.user.name ?? "Owner",
      clientId: proposal.clientId,
      proposalId: proposal.id,
      name: proposal.title || "Client Project",
      code,
      description: `Delivery project initialized from approved proposal ${proposal.reference || ""}.`,
      managerId: session.user.id,
      managerName: session.user.name ?? "Owner",
      budget: proposal.amount ?? 0,
      currency: proposal.currency ?? "INR",
      scopeItems: plan.scopeItems,
      milestones: plan.milestones,
      deliverables: plan.deliverables,
      tasks: plan.tasks,
    });

    return NextResponse.json({
      ok: true,
      project: { id: project.id, code: project.code, name: project.name, stage: project.stage },
      message: `Project ${project.code} successfully launched.`,
    });
  } catch (err: any) {
    console.error("[proposal:create-project] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Could not create project from proposal." }, { status: 500 });
  }
}

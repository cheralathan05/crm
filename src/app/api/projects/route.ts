import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { launchProjectFromApprovedProposal, computeProjectHealthAndActions } from "@/lib/projects";

export const dynamic = "force-dynamic";

/* ── GET /api/projects — List all projects in workspace ──────── */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  if (!user?.workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  const whereClause: any = {
    client: { workspaceId: user.workspace.id },
  };

  if (stage && stage !== "ALL") {
    whereClause.stage = stage;
  }

  if (search && search.trim()) {
    whereClause.OR = [
      { name: { contains: search.trim() } },
      { code: { contains: search.trim() } },
      { client: { companyName: { contains: search.trim() } } },
    ];
  }

  const projects = await db.clientProject.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: { id: true, companyName: true, industry: true },
      },
      proposal: {
        select: { id: true, reference: true, version: true, amount: true, currency: true },
      },
      milestones: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, status: true, progress: true },
      },
      deliverables: {
        select: { id: true, title: true, status: true },
      },
      tasks: {
        select: { id: true, status: true },
      },
      team: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  const enriched = projects.map((p) => {
    const metrics = computeProjectHealthAndActions(p);
    return {
      ...p,
      metrics,
    };
  });

  // Summary Portfolio Stats
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.stage !== "COMPLETED").length;
  const onTrackCount = projects.filter((p) => p.health === "ON_TRACK").length;
  const atRiskCount = projects.filter((p) => p.health === "AT_RISK" || p.health === "BLOCKED").length;
  const totalValue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  return NextResponse.json({
    ok: true,
    projects: enriched,
    stats: {
      totalCount,
      activeCount,
      onTrackCount,
      atRiskCount,
      totalValue,
    },
  });
}

/* ── POST /api/projects — Launch project from approved proposal ─ */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  if (!user?.workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.proposalId || !body.clientId || !body.name || !body.code) {
    return NextResponse.json({ ok: false, message: "Missing required project launch fields." }, { status: 400 });
  }

  try {
    const project = await launchProjectFromApprovedProposal({
      workspaceId: user.workspace.id,
      userId: session.user.id,
      userName: session.user.name ?? "Project Lead",
      clientId: body.clientId,
      proposalId: body.proposalId,
      name: body.name,
      code: body.code,
      description: body.description,
      managerId: body.managerId,
      managerName: body.managerName,
      startDate: body.startDate,
      targetCompletion: body.targetCompletion,
      budget: body.budget,
      currency: body.currency,
      scopeItems: body.scopeItems || [],
      milestones: body.milestones || [],
      deliverables: body.deliverables || [],
      tasks: body.tasks || [],
      teamMembers: body.teamMembers || [],
    });

    return NextResponse.json({
      ok: true,
      project: { id: project.id, code: project.code, name: project.name },
      message: `Project ${project.code} successfully launched.`,
    });
  } catch (err: any) {
    console.error("[projects:create] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to launch project." }, { status: 500 });
  }
}

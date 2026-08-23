import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateProposedWorkPlan, commitWorkPlanToTasks } from "@/lib/ai/orchestrator/work-plan.orchestrator";
import { computeProjectEngineeringReadiness } from "@/lib/engineering/readiness";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/blueprint/work-plan — Propose Work Plan ── */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await generateProposedWorkPlan({ projectId: id });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error || "Could not generate work plan." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      plan: result.plan,
    });
  } catch (err: any) {
    console.error("[api:blueprint:work-plan:generate] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to generate work plan." }, { status: 500 });
  }
}

/* ── PUT /api/projects/[id]/blueprint/work-plan — Commit Approved Work Plan ── */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (!Array.isArray(body.workItems) || body.workItems.length === 0) {
    return NextResponse.json({ ok: false, message: "Valid workItems array is required." }, { status: 400 });
  }

  try {
    const result = await commitWorkPlanToTasks({
      projectId: id,
      workItems: body.workItems,
      userId: session.user.id,
      userName: session.user.name ?? "Technical Lead",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error || "Failed to commit work tasks." }, { status: 500 });
    }

    const readiness = await computeProjectEngineeringReadiness(id);

    return NextResponse.json({
      ok: true,
      count: result.count,
      readiness,
      message: `${result.count} real execution tasks committed to project database with complete Work DNA.`,
    });
  } catch (err: any) {
    console.error("[api:blueprint:work-plan:commit] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to commit work." }, { status: 500 });
  }
}

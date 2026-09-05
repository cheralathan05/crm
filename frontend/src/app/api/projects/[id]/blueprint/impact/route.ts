import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeRequirementImpact } from "@/lib/ai/orchestrator/impact.analyzer";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/blueprint/impact ───────────────── */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.requirementId) {
    return NextResponse.json({ ok: false, message: "requirementId is required." }, { status: 400 });
  }

  try {
    const report = await analyzeRequirementImpact({
      projectId: id,
      requirementId: body.requirementId,
    });
    return NextResponse.json({ ok: true, report });
  } catch (err: any) {
    console.error("[api:impact] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to analyze impact." }, { status: 500 });
  }
}

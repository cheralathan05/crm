import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveBlueprint, getBlueprintVersions } from "@/lib/engineering/blueprint.service";
import { computeProjectEngineeringReadiness } from "@/lib/engineering/readiness";
import { orchestrateEngineeringBlueprint } from "@/lib/ai/orchestrator/blueprint.orchestrator";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/blueprint ───────────────────────── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const blueprint = await getActiveBlueprint(id);
    const versions = await getBlueprintVersions(id);
    const readiness = await computeProjectEngineeringReadiness(id);

    return NextResponse.json({
      ok: true,
      blueprint,
      versions,
      readiness,
    });
  } catch (err: any) {
    console.error("[api:blueprint:get] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load blueprint." }, { status: 500 });
  }
}

/* ── POST /api/projects/[id]/blueprint — Generate/Regenerate Blueprint ── */
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

  try {
    const result = await orchestrateEngineeringBlueprint({
      projectId: id,
      userId: session.user.id,
      userName: session.user.name ?? "Architect",
      forceNewVersion: !!body.forceNewVersion,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error || "Failed to generate blueprint." }, { status: 500 });
    }

    const blueprint = await getActiveBlueprint(id);
    const readiness = await computeProjectEngineeringReadiness(id);

    return NextResponse.json({
      ok: true,
      blueprint,
      readiness,
      source: result.source,
      message: `Engineering Blueprint v${blueprint?.version} generated successfully via ${result.source}.`,
    });
  } catch (err: any) {
    console.error("[api:blueprint:generate] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Generation error." }, { status: 500 });
  }
}

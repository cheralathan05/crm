import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveEngineeringBlueprint, getActiveBlueprint } from "@/lib/engineering/blueprint.service";
import { computeProjectEngineeringReadiness } from "@/lib/engineering/readiness";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/projects/[id]/blueprint/approve ──────────────── */
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

  if (!body.blueprintId) {
    return NextResponse.json({ ok: false, message: "blueprintId is required." }, { status: 400 });
  }

  try {
    const approved = await approveEngineeringBlueprint({
      blueprintId: body.blueprintId,
      userId: session.user.id,
      userName: session.user.name ?? "Technical Lead",
      comment: body.comment,
    });

    const blueprint = await getActiveBlueprint(id);
    const readiness = await computeProjectEngineeringReadiness(id);

    return NextResponse.json({
      ok: true,
      blueprint,
      readiness,
      message: `Engineering Blueprint v${approved.version} approved. Work generation unlocked.`,
    });
  } catch (err: any) {
    console.error("[api:blueprint:approve] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Approval failed." }, { status: 500 });
  }
}

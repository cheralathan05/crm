import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementLineage } from "@/lib/lineage-engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/requirements/[id]/lineage ─────────────────────────
   Returns the full 11-link lineage chain (Rule 26 & 27) for a requirement:
   Business Problem → User → Capability → Workflow → Requirement →
   Frontend → Backend → Database → QA → Acceptance Criteria → Project & Tasks */

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const feature = url.searchParams.get("feature") || undefined;
  const projectId = url.searchParams.get("projectId") || undefined;

  try {
    const lineage = await getRequirementLineage({
      requirementId: id,
      featureNameOrCode: feature,
      projectId,
    });

    if (!lineage) {
      return NextResponse.json({ ok: false, message: "Requirement not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lineage });
  } catch (err: any) {
    console.error("[api:lineage:get] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to retrieve lineage." }, { status: 500 });
  }
}

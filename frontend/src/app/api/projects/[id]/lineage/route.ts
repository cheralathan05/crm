import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementLineage } from "@/lib/lineage-engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/lineage ─────────────────────────────
   Returns the full 11-link lineage chain (Rule 26 & 27) for any
   engineering requirement or task within an active project. */

export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const reqCode = url.searchParams.get("reqId") || url.searchParams.get("feature") || undefined;

  const project = await db.clientProject.findUnique({
    where: { id },
    include: {
      tasks: true,
      proposal: true,
    },
  });

  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  const requirementId = project.requirementRequestId || project.proposal?.requirementRequestId;
  if (!requirementId) {
    return NextResponse.json({
      ok: false,
      message: "Project has no linked requirement request provenance.",
    }, { status: 400 });
  }

  try {
    const lineage = await getRequirementLineage({
      requirementId,
      featureNameOrCode: reqCode,
      projectId: project.id,
    });

    return NextResponse.json({ ok: true, lineage });
  } catch (err: any) {
    console.error("[api:project:lineage:get] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to retrieve lineage." }, { status: 500 });
  }
}

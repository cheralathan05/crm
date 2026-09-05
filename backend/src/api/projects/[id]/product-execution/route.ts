import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectForUser } from "@/lib/projects";
import { deriveProductModelForProject, syncProductModelToDatabase } from "@/lib/product-execution/product-model.service";
import { generateProductWorkGraph } from "@/lib/product-execution/work-graph-engine.service";
import { auditAndCleanExistingTasks } from "@/lib/product-execution/task-audit-cleanup.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/product-execution ─────────────────── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  try {
    const productModel = await deriveProductModelForProject(id);

    const productAreas = await db.productArea.findMany({
      where: { projectId: id },
      include: {
        responsibilities: {
          include: {
            workItems: {
              where: { isInvalidWork: false },
              include: {
                dependencies: {
                  include: { dependsOnTask: true },
                },
                dependentOnMe: {
                  include: { task: true },
                },
                acceptanceCriteria: true,
                submissions: { take: 1, orderBy: { iteration: "desc" } },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        blockers: { where: { status: "ACTIVE" } },
      },
      orderBy: { order: "asc" },
    });

    const gates = await db.projectGate.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
    });

    const activeBlockers = await db.projectBlocker.findMany({
      where: { projectId: id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      productModel,
      productAreas,
      gates,
      activeBlockers,
    });
  } catch (err: any) {
    console.error("[api:product-execution:get] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load product execution data." }, { status: 500 });
  }
}

/* ── POST /api/projects/[id]/product-execution ────────────────── */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  try {
    // 1. Audit and mark invalid legacy tasks
    const audit = await auditAndCleanExistingTasks(id);

    // 2. Sync authentic Product Areas and Responsibilities
    await syncProductModelToDatabase(id);

    // 3. Generate deterministic work graph
    const result = await generateProductWorkGraph(id);

    const productModel = await deriveProductModelForProject(id);

    return NextResponse.json({
      ok: true,
      message: "Product execution engine synced successfully.",
      audit,
      result,
      productModel,
    });
  } catch (err: any) {
    console.error("[api:product-execution:post] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to execute product sync." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRootCauseGraph } from "@/lib/analytics/root-cause.service";
import { getScopeDriftAnalysis } from "@/lib/analytics/scope-drift.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id: projectId } = await props.params;

  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      proposal: true,
      milestones: { orderBy: { order: "asc" } },
      deliverables: {
        include: {
          tasks: {
            include: {
              reviews: { take: 1, orderBy: { createdAt: "desc" } },
              submissions: { take: 1, orderBy: { createdAt: "desc" } },
              dependencies: { include: { dependsOnTask: true } },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      staffAllocations: {
        where: { releasedAt: null },
        include: { employee: true },
      },
      projectBlockers: { where: { status: "ACTIVE" } },
      projectGates: true,
    },
  });

  if (!project) {
    return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
  }

  try {
    const [rootCause, scopeDrift] = await Promise.all([
      getRootCauseGraph(project.id),
      getScopeDriftAnalysis(project.client.workspaceId, project.id),
    ]);

    // Calculate progress
    const allTasks = project.deliverables.flatMap((d) => d.tasks);
    const completedTasks = allTasks.filter(
      (t) => t.status === "DONE" || t.status === "COMPLETED" || t.status === "CLIENT_APPROVED",
    );
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    return NextResponse.json({
      ok: true,
      data: {
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          clientName: project.client.companyName,
          health: project.health,
          stage: project.stage,
          progress,
          budget: project.budget,
          currency: project.currency,
          tasksCount: allTasks.length,
          completedCount: completedTasks.length,
          activeBlockersCount: project.projectBlockers.length,
        },
        deliverables: project.deliverables,
        staff: project.staffAllocations,
        blockers: project.projectBlockers,
        gates: project.projectGates,
        rootCause,
        scopeDrift,
      },
    });
  } catch (error: any) {
    console.error("Project Control Room error:", error);
    return NextResponse.json(
      { ok: false, message: "Project Control Room data unavailable.", error: error.message },
      { status: 500 },
    );
  }
}

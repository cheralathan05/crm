import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTaskCommandCenterMetrics } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── GET /api/tasks/command-center — Live Operational Metrics ──── */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const workspace = await db.workspace.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || undefined;

  const [metrics, projects] = await Promise.all([
    getTaskCommandCenterMetrics(workspace.id, session.user.id, projectId),
    db.clientProject.findMany({
      where: { client: { workspaceId: workspace.id } },
      select: { id: true, name: true, clientId: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ ok: true, metrics, projects });
}

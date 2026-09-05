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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });
  const workspaceId = user?.workspace?.id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || undefined;

  const [metrics, projects] = await Promise.all([
    getTaskCommandCenterMetrics(workspaceId, session.user.id, projectId),
    db.clientProject.findMany({
      where: { client: { workspaceId } },
      select: { id: true, name: true, clientId: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ ok: true, metrics, projects });
}

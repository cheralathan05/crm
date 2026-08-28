import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { discoverWorkForResponsibility } from "@/lib/employees/workstream-assignment.service";

/* ── GET /api/employees/assign-work/discover ─────────────────────────
   Discovers all work under a workstream for a given project.
   Query: ?projectId=X&workstream=Y
──────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const workspace =
      (await db.workspace.findFirst({
        where: user?.role === "OWNER" ? { ownerId: user.id } : undefined,
      })) || (await db.workspace.findFirst());

    if (!workspace) {
      return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const workstream = searchParams.get("workstream");

    if (!projectId || !workstream) {
      return NextResponse.json(
        { ok: false, message: "projectId and workstream are required." },
        { status: 400 }
      );
    }

    const discovered = await discoverWorkForResponsibility(projectId, workstream);
    return NextResponse.json({ ok: true, ...discovered });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to discover work." },
      { status: 500 }
    );
  }
}

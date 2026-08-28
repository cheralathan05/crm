import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignmentAnalysis } from "@/lib/employees/workstream-assignment.service";

/* ── GET /api/employees/assign-work/analysis ─────────────────────────
   Pre-assignment analysis: role match, capacity, risks, recommendation.
   Query: ?employeeId=X&projectId=Y&workstream=Z
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
    const employeeId = searchParams.get("employeeId");
    const projectId = searchParams.get("projectId");
    const workstream = searchParams.get("workstream");

    if (!employeeId || !projectId || !workstream) {
      return NextResponse.json(
        { ok: false, message: "employeeId, projectId, and workstream are required." },
        { status: 400 }
      );
    }

    const analysis = await getAssignmentAnalysis(employeeId, projectId, workstream);
    return NextResponse.json({ ok: true, ...analysis });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to analyze assignment." },
      { status: 500 }
    );
  }
}

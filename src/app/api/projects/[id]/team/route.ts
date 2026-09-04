import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectTeamOverview } from "@/lib/projects/project-team.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "Project ID is required" }, { status: 400 });
    }

    const overview = await getProjectTeamOverview(projectId, session?.user?.id || null);

    return NextResponse.json({
      ok: true,
      data: overview,
    });
  } catch (error: any) {
    console.error("[api/projects/[id]/team] Error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to load project team data" },
      { status: 500 }
    );
  }
}

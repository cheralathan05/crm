import { NextRequest, NextResponse } from "next/server";
import { getProjectBuildReviews } from "@/lib/employees/employee-build-journey.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ ok: false, message: "Project ID is required." }, { status: 400 });
    }

    const reviews = await getProjectBuildReviews(projectId);
    return NextResponse.json({ ok: true, data: reviews });
  } catch (err: any) {
    console.error("[api/projects/[id]/reviews] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load project reviews." }, { status: 500 });
  }
}

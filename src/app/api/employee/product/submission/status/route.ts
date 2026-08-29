import { NextRequest, NextResponse } from "next/server";
import { getSubmissionJourneyStatus } from "@/lib/employees/employee-build-journey.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buildId = searchParams.get("buildId");

    if (!buildId) {
      return NextResponse.json({ ok: false, message: "buildId query param required." }, { status: 400 });
    }

    const data = await getSubmissionJourneyStatus(buildId);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/employee/product/submission/status] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load submission status." }, { status: 500 });
  }
}

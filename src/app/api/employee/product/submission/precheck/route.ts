import { NextRequest, NextResponse } from "next/server";
import { getPreSubmissionData } from "@/lib/employees/employee-build-journey.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId } = body;

    if (!buildId) {
      return NextResponse.json({ ok: false, message: "buildId is required." }, { status: 400 });
    }

    const data = await getPreSubmissionData(buildId);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/employee/product/submission/precheck] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load pre-submission data." }, { status: 500 });
  }
}

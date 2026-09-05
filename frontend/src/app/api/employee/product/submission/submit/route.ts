import { NextRequest, NextResponse } from "next/server";
import { submitBuildForVerification } from "@/lib/employees/employee-build-journey.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, whatYouBuilt } = body;

    if (!buildId) {
      return NextResponse.json({ ok: false, message: "buildId is required." }, { status: 400 });
    }

    const result = await submitBuildForVerification({
      buildId,
      whatYouBuilt,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/employee/product/submission/submit] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to submit build for verification." }, { status: 500 });
  }
}

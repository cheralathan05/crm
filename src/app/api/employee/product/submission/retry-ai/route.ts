import { NextRequest, NextResponse } from "next/server";
import { retryAiVerification } from "@/lib/employees/employee-build-journey.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ ok: false, message: "submissionId is required." }, { status: 400 });
    }

    const result = await retryAiVerification(submissionId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/employee/product/submission/retry-ai] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to retry AI verification." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { aiReviewBuildWithOllama } from "@/lib/employees/employee-product-workspace.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, requirementText, acceptanceCriteria, proofDescription } = body;

    const evaluation = await aiReviewBuildWithOllama({
      buildId,
      requirementText: requirementText || "Standard project requirement compliance",
      acceptanceCriteria: acceptanceCriteria || ["UI implementation complete", "Data contracts verified"],
      proofDescription: proofDescription || "Built UI component and connected data payload",
    });

    return NextResponse.json({ ok: true, evaluation });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to evaluate review." }, { status: 500 });
  }
}

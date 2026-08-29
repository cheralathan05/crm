import { NextRequest, NextResponse } from "next/server";
import { executeAdminDecision } from "@/lib/employees/employee-build-journey.service";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const body = await req.json();
    const { decision, comment, issue, requiredChange, affectedCriterion, reviewerName, reviewerId } = body;

    if (!submissionId || !decision) {
      return NextResponse.json({ ok: false, message: "submissionId and decision are required." }, { status: 400 });
    }

    if (!["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)) {
      return NextResponse.json({ ok: false, message: "Invalid decision value." }, { status: 400 });
    }

    const session = await auth();
    const activeReviewerName = reviewerName || session?.user?.name || "Project Administrator";
    const activeReviewerId = reviewerId || session?.user?.id;

    const result = await executeAdminDecision({
      submissionId,
      decision,
      reviewerId: activeReviewerId,
      reviewerName: activeReviewerName,
      comment,
      issue,
      requiredChange,
      affectedCriterion,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/projects/[id]/reviews/[submissionId]] Error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to record review decision." }, { status: 500 });
  }
}

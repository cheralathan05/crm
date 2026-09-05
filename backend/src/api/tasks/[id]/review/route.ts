import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reviewTaskSubmission } from "@/lib/tasks/task-engine.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id: submissionId } = await params;
    const body = await req.json();
    const { decision, reason, comment } = body;

    if (!decision || (decision !== "APPROVED" && decision !== "CHANGES_REQUESTED")) {
      return NextResponse.json(
        { ok: false, message: "Valid decision ('APPROVED' or 'CHANGES_REQUESTED') is required." },
        { status: 400 }
      );
    }

    if (decision === "CHANGES_REQUESTED" && (!reason || !reason.trim())) {
      return NextResponse.json(
        { ok: false, message: "A specific reason is required when requesting changes." },
        { status: 400 }
      );
    }

    const result = await reviewTaskSubmission({
      submissionId,
      reviewerId: user.id,
      reviewerName: user.name || "Reviewer",
      decision,
      reason,
      comment,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[api/tasks/[id]/review] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process review." },
      { status: 500 }
    );
  }
}

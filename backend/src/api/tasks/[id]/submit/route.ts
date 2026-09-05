import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitTaskForReview } from "@/lib/tasks/task-engine.service";

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

    const { id: taskId } = await params;
    const body = await req.json();
    const { summary, proofType, proofUrl, knownIssues, comments } = body;

    let employee = await db.employee.findFirst({
      where: {
        OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email.toLowerCase() }] : [])],
      },
    });

    if (!employee) {
      employee = await db.employee.findFirst();
    }

    if (!employee) {
      return NextResponse.json({ ok: false, message: "Employee profile not found." }, { status: 403 });
    }

    const result = await submitTaskForReview({
      taskId,
      employeeId: employee.id,
      summary,
      proofType: proofType || "SCREENSHOT",
      proofUrl,
      knownIssues,
      comments,
    });

    return NextResponse.json({
      ok: true,
      submission: result.submission,
      task: result.task,
    });
  } catch (err: any) {
    console.error("[api/tasks/[id]/submit] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to submit work proof." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitTaskForReview } from "@/lib/tasks/task-engine.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const {
      taskId,
      proofSummary,
      evidenceUrl,
      evidenceType = "SCREENSHOT",
      notes,
      knownIssues,
      comments,
    } = body;

    if (!taskId) {
      return NextResponse.json({ ok: false, message: "taskId is required." }, { status: 400 });
    }

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
      summary: proofSummary || notes || "Work completed and verified.",
      proofType: evidenceType,
      proofUrl: evidenceUrl,
      knownIssues: knownIssues || null,
      comments: comments || notes || null,
    });

    return NextResponse.json({
      ok: true,
      submission: result.submission,
      task: result.task,
    });
  } catch (err: any) {
    console.error("[api/employee/work/handoff] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to submit work handoff." },
      { status: 500 }
    );
  }
}

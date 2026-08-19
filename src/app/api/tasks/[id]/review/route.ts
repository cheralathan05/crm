import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndAdvanceDeliverable } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/tasks/[id]/review — Submit, Approve or Request Changes ─ */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { action, feedback } = body; // action: "SUBMIT" | "APPROVE" | "REQUEST_CHANGES"
  const actorName = session.user.name ?? "Team Member";

  const task = await db.clientTask.findUnique({
    where: { id },
    include: {
      subtasks: true,
      acceptanceCriteria: true,
      deliverable: true,
    },
  });

  if (!task) {
    return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
  }

  if (action === "SUBMIT") {
    // Submit task for review
    const review = await db.taskReview.create({
      data: {
        taskId: id,
        reviewerName: "Project Lead",
        status: "PENDING",
        feedback: feedback || "Submitted for internal review.",
      },
    });

    await db.clientTask.update({
      where: { id },
      data: { status: "IN_REVIEW" },
    });

    await db.taskActivity.create({
      data: {
        taskId: id,
        type: "SUBMITTED_FOR_REVIEW",
        title: "Task Submitted for Review",
        detail: feedback || "All subtasks completed and submitted for manager review.",
        actorName,
      },
    });

    return NextResponse.json({ ok: true, review, status: "IN_REVIEW" });
  }

  if (action === "APPROVE") {
    // Approve task -> COMPLETED
    const review = await db.taskReview.create({
      data: {
        taskId: id,
        reviewerId: session.user.id,
        reviewerName: actorName,
        status: "APPROVED",
        feedback: feedback || "Approved with all acceptance criteria satisfied.",
        decidedAt: new Date(),
      },
    });

    // Mark criteria passed if any are pending
    await db.taskAcceptanceCriterion.updateMany({
      where: { taskId: id, status: "NOT_STARTED" },
      data: { status: "PASSED", verifiedAt: new Date(), verifiedBy: actorName },
    });

    // Mark subtasks completed
    await db.subTask.updateMany({
      where: { taskId: id, completed: false },
      data: { completed: true, completedAt: new Date() },
    });

    await db.clientTask.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await db.taskActivity.create({
      data: {
        taskId: id,
        type: "REVIEW_APPROVED",
        title: "Task Approved & Completed",
        detail: feedback || "Reviewer approved the implementation.",
        actorName,
      },
    });

    if (task.deliverableId) {
      await checkAndAdvanceDeliverable(task.deliverableId, actorName);
    }

    return NextResponse.json({ ok: true, review, status: "COMPLETED" });
  }

  if (action === "REQUEST_CHANGES") {
    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ ok: false, message: "Feedback reason is required when requesting changes." }, { status: 400 });
    }

    const review = await db.taskReview.create({
      data: {
        taskId: id,
        reviewerId: session.user.id,
        reviewerName: actorName,
        status: "CHANGES_REQUESTED",
        feedback: feedback.trim(),
        decidedAt: new Date(),
      },
    });

    await db.clientTask.update({
      where: { id },
      data: { status: "CHANGES_REQUESTED" },
    });

    await db.taskActivity.create({
      data: {
        taskId: id,
        type: "CHANGES_REQUESTED",
        title: "Changes Requested by Reviewer",
        detail: feedback.trim(),
        actorName,
      },
    });

    return NextResponse.json({ ok: true, review, status: "CHANGES_REQUESTED" });
  }

  return NextResponse.json({ ok: false, message: "Invalid review action." }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewTaskSubmission } from "@/lib/tasks/task-engine.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const employee = await db.employee.findFirst({
      where: {
        OR: [{ userId: user.id }, ...(user.email ? [{ email: user.email.toLowerCase() }] : [])],
      },
    });

    const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

    // 1. My Task Submissions
    const mySubmissions = employee
      ? await db.taskSubmission.findMany({
          where: { employeeId: employee.id },
          include: {
            task: {
              select: {
                id: true,
                code: true,
                title: true,
                layer: true,
                expectedResult: true,
                acceptanceCriteria: true,
                dependencies: {
                  include: {
                    dependsOnTask: { select: { id: true, code: true, title: true, status: true } },
                  },
                },
              },
            },
            project: { select: { id: true, name: true, code: true } },
            reviews: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { submittedAt: "desc" },
        })
      : [];

    // 2. Incoming Task Submissions for Review Queue
    const incomingWhere: any = {
      status: { in: ["SUBMITTED", "IN_REVIEW", "CHANGES_REQUESTED"] },
    };

    if (!isAdmin && employee) {
      const allocs = await db.projectStaffAllocation.findMany({
        where: { employeeId: employee.id, releasedAt: null },
        select: { projectId: true },
      });
      const projectIds = allocs.map((a) => a.projectId);
      incomingWhere.projectId = { in: projectIds };
    }

    const incomingTaskSubmissions = await db.taskSubmission.findMany({
      where: incomingWhere,
      include: {
        task: {
          select: {
            id: true,
            code: true,
            title: true,
            layer: true,
            expectedResult: true,
            acceptanceCriteria: true,
            dependencies: {
              include: {
                dependsOnTask: { select: { id: true, code: true, title: true, status: true } },
              },
            },
          },
        },
        project: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true, department: true } },
        reviews: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Format into unified review items
    const formattedIncoming = incomingTaskSubmissions.map((s) => ({
      id: s.id,
      submissionCode: s.submissionCode,
      featureName: s.task.title,
      taskCode: s.task.code,
      taskId: s.taskId,
      projectId: s.projectId,
      project: s.project,
      employee: s.employee,
      workstream: s.task.layer || "ENGINEERING",
      responsibility: `${s.task.code} Verification`,
      expectedResult: s.task.expectedResult,
      whatYouBuilt: s.summary,
      proofs: s.proofUrl
        ? [
            {
              id: `proof-${s.id}`,
              type: s.proofType,
              title: `Proof (Iteration #${s.iteration})`,
              evidenceUrl: s.proofUrl,
            },
          ]
        : [],
      reviewDecisions: s.reviews.map((r) => ({
        id: r.id,
        decision: r.status,
        reviewerName: r.reviewerName,
        comment: r.feedback,
        requiredChange: r.status === "CHANGES_REQUESTED" ? r.feedback : null,
        reviewedAt: r.decidedAt || r.createdAt,
      })),
      acceptanceCriteria: s.task.acceptanceCriteria || [],
      dependencies: s.task.dependencies || [],
      version: s.iteration,
      status: s.status,
      submittedAt: s.submittedAt,
    }));

    const formattedMy = mySubmissions.map((s) => ({
      id: s.id,
      submissionCode: s.submissionCode,
      featureName: s.task.title,
      taskCode: s.task.code,
      taskId: s.taskId,
      projectId: s.projectId,
      project: s.project,
      responsibility: `${s.task.code} Verification`,
      expectedResult: s.task.expectedResult,
      whatYouBuilt: s.summary,
      proofs: s.proofUrl
        ? [
            {
              id: `proof-${s.id}`,
              type: s.proofType,
              title: `Proof (Iteration #${s.iteration})`,
              evidenceUrl: s.proofUrl,
            },
          ]
        : [],
      reviewDecisions: s.reviews.map((r) => ({
        id: r.id,
        decision: r.status,
        reviewerName: r.reviewerName,
        comment: r.feedback,
        requiredChange: r.status === "CHANGES_REQUESTED" ? r.feedback : null,
        reviewedAt: r.decidedAt || r.createdAt,
      })),
      acceptanceCriteria: s.task.acceptanceCriteria || [],
      dependencies: s.task.dependencies || [],
      version: s.iteration,
      status: s.status,
      submittedAt: s.submittedAt,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        incomingReviews: formattedIncoming,
        mySubmissions: formattedMy,
      },
    });
  } catch (err: any) {
    console.error("[api/employee/reviews] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load reviews." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, decision, comment, requiredChange } = body;

    if (!submissionId || !decision) {
      return NextResponse.json(
        { ok: false, message: "submissionId and decision are required." },
        { status: 400 }
      );
    }

    // Check if it's a TaskSubmission
    const taskSubmission = await db.taskSubmission.findUnique({
      where: { id: submissionId },
    });

    if (taskSubmission) {
      const reason = requiredChange || comment;
      const result = await reviewTaskSubmission({
        submissionId,
        reviewerId: user.id,
        reviewerName: user.name || "Reviewer",
        decision,
        reason,
        comment,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // Legacy BuildSubmission fallback
    const buildSub = await db.buildSubmission.findUnique({
      where: { id: submissionId },
    });

    if (buildSub) {
      const newStatus = decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED";
      await db.buildSubmission.update({
        where: { id: submissionId },
        data: { status: newStatus },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: "Submission not found." }, { status: 404 });
  } catch (err: any) {
    console.error("[api/employee/reviews] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process review." },
      { status: 500 }
    );
  }
}

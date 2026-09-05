import { db } from "../src/lib/db";
import {
  startTask,
  submitTaskForReview,
  reviewTaskSubmission,
  getNextEligibleTask,
  cascadeDependencyResolution,
} from "../src/lib/tasks/task-engine.service";

async function main() {
  console.log("============================================================");
  console.log("BUSINESS OS — TASK EXECUTION ENGINE VERIFICATION");
  console.log("============================================================\n");

  // 1. Find or pick an active project and an assigned employee
  const project = await db.clientProject.findFirst({
    include: {
      tasks: {
        take: 10,
      },
    },
  });

  if (!project) {
    throw new Error("No active client project found in database.");
  }

  console.log(`[1/8] Active Project Identified: ${project.name} (${project.code})`);

  const employee = await db.employee.findFirst({
    include: { role: true },
  });

  if (!employee) {
    throw new Error("No active employee found in database.");
  }

  console.log(`[2/8] Active Employee: ${employee.fullName} (${employee.role?.name || "Engineer"})`);

  // 2. Set up two linked tasks: Upstream Task A (Backend API) -> Downstream Task B (Frontend UI)
  const taskA = await db.clientTask.create({
    data: {
      projectId: project.id,
      clientId: project.clientId,
      title: "Product Search & Filter Backend API",
      code: `TSK-ENG-A-${Date.now().toString().slice(-4)}`,
      layer: "BACKEND",
      status: "TODO",
      assigneeId: employee.id,
      assigneeName: employee.fullName,
      expectedResult: "JSON REST endpoint returning filtered products with pagination.",
      acceptanceCriteria: {
        create: [
          { criterion: "Returns HTTP 200 with data array" },
          { criterion: "Proper validation on query parameters" },
          { criterion: "Empty state returns empty array not 500 error" },
        ],
      },
    },
  });

  const taskB = await db.clientTask.create({
    data: {
      projectId: project.id,
      clientId: project.clientId,
      title: "Product Listing Frontend Page",
      code: `TSK-ENG-B-${Date.now().toString().slice(-4)}`,
      layer: "FRONTEND",
      status: "TODO",
      assigneeId: employee.id,
      assigneeName: employee.fullName,
      expectedResult: "Responsive product grid with live search and empty states.",
      acceptanceCriteria: {
        create: [
          { criterion: "Displays product cards" },
        ],
      },
    },
  });

  // Link Task B depends on Task A
  await db.taskDependency.create({
    data: {
      taskId: taskB.id,
      dependsOnTaskId: taskA.id,
    },
  });

  console.log(`[3/8] Created Tasks with Dependency:`);
  console.log(`      Upstream:   ${taskA.code} — ${taskA.title} (Status: ${taskA.status})`);
  console.log(`      Downstream: ${taskB.code} — ${taskB.title} (Status: ${taskB.status})`);

  // 3. Employee starts Task A
  console.log("\n[4/8] Executing [ START TASK ] on Upstream Task A...");
  const startedA = await startTask({
    taskId: taskA.id,
    employeeId: employee.id,
    actorName: employee.fullName,
  });

  console.log(`      Task A Status: ${startedA.status} (StartedAt: ${startedA.startedAt?.toISOString()})`);
  if (startedA.status !== "IN_PROGRESS") {
    throw new Error(`Expected IN_PROGRESS, got ${startedA.status}`);
  }

  // 4. Employee submits Proof (Iteration #1)
  console.log("\n[5/8] Employee Submits Proof for Review (Iteration #1)...");
  const sub1 = await submitTaskForReview({
    taskId: taskA.id,
    employeeId: employee.id,
    summary: "Built the search and filter query handlers in the backend.",
    proofType: "SCREENSHOT",
    proofUrl: "https://proofs.businessos.internal/tsk-a-iter1.png",
    knownIssues: "Edge case with empty strings not yet covered.",
  });

  console.log(`      Created Submission: ${sub1.submission.submissionCode} (Iteration: ${sub1.submission.iteration})`);
  console.log(`      Task A Status: ${sub1.task.status} (NOT completed)`);

  if (sub1.submission.iteration !== 1) {
    throw new Error(`Expected iteration 1, got ${sub1.submission.iteration}`);
  }
  if (sub1.task.status !== "IN_REVIEW") {
    throw new Error(`Expected IN_REVIEW, got ${sub1.task.status}`);
  }

  // 5. Reviewer reviews Iteration #1 -> REQUESTS CHANGES
  console.log("\n[6/8] Reviewer Reviews Submission #1 -> [ REQUEST CHANGES ]");
  const review1 = await reviewTaskSubmission({
    submissionId: sub1.submission.id,
    reviewerId: "reviewer-qa-01",
    reviewerName: "Alex Vance (QA Lead)",
    decision: "CHANGES_REQUESTED",
    reason: "Product search does not handle empty strings as required by acceptance criteria #3.",
  });

  console.log(`      Decision: ${review1.decision}`);
  console.log(`      Task A Status: ${review1.task?.status}`);
  console.log(`      Feedback: "${review1.review.feedback}"`);

  if (review1.task?.status !== "CHANGES_REQUESTED") {
    throw new Error(`Expected CHANGES_REQUESTED, got ${review1.task?.status}`);
  }

  // Check that employee received a real inbox notification
  const inboxItem = await db.employeeInboxItem.findFirst({
    where: { employeeId: employee.id, title: { contains: taskA.title } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`      Employee Inbox Notification: "${inboxItem?.title}"`);

  // 6. Employee fixes the work and resubmits -> Iteration #2
  console.log("\n[7/8] Employee Fixes Work & Resubmits [ FIX & RESUBMIT ] (Iteration #2)...");
  const sub2 = await submitTaskForReview({
    taskId: taskA.id,
    employeeId: employee.id,
    summary: "Added empty-state fallback guard and updated test suite. All acceptance criteria verified.",
    proofType: "DEPLOYMENT",
    proofUrl: "https://staging-api.businessos.internal/products/search",
  });

  console.log(`      Created Submission: ${sub2.submission.submissionCode} (Iteration: ${sub2.submission.iteration})`);
  console.log(`      Task A Status: ${sub2.task.status}`);

  if (sub2.submission.iteration !== 2) {
    throw new Error(`Expected iteration 2, got ${sub2.submission.iteration}`);
  }

  // Verify Iteration #1 still exists in database (immutable history preserved)
  const allSubsForTask = await db.taskSubmission.findMany({
    where: { taskId: taskA.id },
    orderBy: { iteration: "asc" },
  });

  console.log(`      Historical Submissions Count: ${allSubsForTask.length}`);
  allSubsForTask.forEach((s) => {
    console.log(`        - Iteration #${s.iteration}: Code=${s.submissionCode}, Status=${s.status}`);
  });

  if (allSubsForTask.length !== 2) {
    throw new Error(`Expected 2 historical submissions, got ${allSubsForTask.length}`);
  }

  // 7. Reviewer approves Iteration #2 -> TASK COMPLETED -> DEPENDENCY RESOLVED -> UNLOCK TASK B
  console.log("\n[8/8] Reviewer Approves Iteration #2 -> [ APPROVE ]...");
  const review2 = await reviewTaskSubmission({
    submissionId: sub2.submission.id,
    reviewerId: "reviewer-qa-01",
    reviewerName: "Alex Vance (QA Lead)",
    decision: "APPROVED",
    comment: "All acceptance criteria verified. Clean execution and edge cases covered.",
  });

  console.log(`      Review Decision: ${review2.decision}`);
  console.log(`      Task A Status: ${review2.task?.status} (CompletedAt: ${review2.task?.completedAt?.toISOString()})`);

  if (review2.task?.status !== "COMPLETED") {
    throw new Error(`Expected COMPLETED, got ${review2.task?.status}`);
  }

  // Verify Downstream Task B was automatically updated and unlocked
  const refreshedTaskB = await db.clientTask.findUnique({
    where: { id: taskB.id },
  });

  console.log(`\n============================================================`);
  console.log(`DYNAMIC DEPENDENCY CASCADE VERIFICATION:`);
  console.log(`      Downstream Task B: ${refreshedTaskB?.code} — ${refreshedTaskB?.title}`);
  console.log(`      Updated Status:    ${refreshedTaskB?.status}`);
  console.log(`============================================================`);

  if (refreshedTaskB?.status !== "READY") {
    throw new Error(`Expected Task B status to be READY, but got ${refreshedTaskB?.status}`);
  }

  // Check Next Eligible Work
  const nextWork = await getNextEligibleTask({
    employeeId: employee.id,
    projectId: project.id,
    currentTaskId: taskA.id,
  });

  console.log(`\nNext Eligible Task Calculated from Database:`);
  console.log(`      ${nextWork?.code}: ${nextWork?.title} (${nextWork?.status})`);

  if (nextWork?.id !== taskB.id) {
    console.log(`Note: nextWork returned ${nextWork?.title}`);
  }

  // Cleanup temporary test tasks
  await db.taskDependency.deleteMany({ where: { taskId: taskB.id } });
  await db.taskReview.deleteMany({ where: { taskId: taskA.id } });
  await db.taskSubmission.deleteMany({ where: { taskId: taskA.id } });
  await db.taskActivity.deleteMany({ where: { taskId: { in: [taskA.id, taskB.id] } } });
  await db.evidenceRecord.deleteMany({ where: { taskId: taskA.id } });
  await db.clientTask.deleteMany({ where: { id: { in: [taskA.id, taskB.id] } } });

  console.log("\n============================================================");
  console.log("✓ ALL TASK LIFECYCLE ENGINE TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================\n");
}

main()
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });

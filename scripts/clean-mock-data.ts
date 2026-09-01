import { db } from "../src/lib/db";

async function cleanMockData() {
  console.log("--- CLEANING MOCK PROOFS, SUBMISSIONS, & RESETTING TEST DATA ---");

  // 1. Delete all test build verification reports, jobs, review decisions, audit events, submissions, proofs
  const delDecisions = await db.buildReviewDecision.deleteMany({});
  console.log(`Deleted ${delDecisions.count} review decisions.`);

  const delReports = await db.buildVerificationReport.deleteMany({});
  console.log(`Deleted ${delReports.count} verification reports.`);

  const delJobs = await db.buildVerificationJob.deleteMany({});
  console.log(`Deleted ${delJobs.count} verification jobs.`);

  const delAudits = await db.buildJourneyAuditEvent.deleteMany({});
  console.log(`Deleted ${delAudits.count} audit events.`);

  const delProofs = await db.buildProof.deleteMany({});
  console.log(`Deleted ${delProofs.count} build proofs.`);

  const delSubs = await db.buildSubmission.deleteMany({});
  console.log(`Deleted ${delSubs.count} submissions.`);

  // 2. Reset ProductBuild statuses to clean initial state
  const resetBuilds = await db.productBuild.updateMany({
    data: {
      status: "BUILDING",
      currentStep: "BUILD_UI",
      checklistState: "{}",
      blockedReason: null,
      blockedDependency: null,
      blockedOwnerRole: null,
    },
  });
  console.log(`Reset ${resetBuilds.count} product builds to clean BUILDING state.`);

  // 3. Reset any tasks that were mistakenly set to IN_REVIEW back to TODO / IN_PROGRESS
  const resetTasks = await db.clientTask.updateMany({
    where: {
      status: "IN_REVIEW",
    },
    data: {
      status: "TODO",
    },
  });
  console.log(`Reset ${resetTasks.count} tasks from IN_REVIEW to TODO.`);

  // 4. Also clean any mock employee inbox items generated during test runs
  const delInbox = await db.employeeInboxItem.deleteMany({
    where: {
      title: { contains: "Build Ready for Review" },
    },
  });
  console.log(`Deleted ${delInbox.count} test inbox items.`);

  console.log("--- CLEANUP COMPLETED SUCCESSFULLY ---");
}

cleanMockData()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));

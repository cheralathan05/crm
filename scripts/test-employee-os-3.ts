import { db } from "../src/lib/db";
import {
  getEmployeeOSHomeData,
  getEmployeeMyDayData,
  startBuildSession,
  endBuildSession,
  getDependencyRadarData,
  getProjectDecisionsData,
  getEmployeeInboxData,
  askEmployeeAICoach,
} from "../src/lib/employees/employee-os.service";

async function verifyEmployeeOS3() {
  console.log("============================================================");
  console.log("VERIFYING: BUSINESS OS — EMPLOYEE OS PRODUCT LEVEL 3.0");
  console.log("============================================================");

  // 1. Fetch real project from database
  const project = await db.clientProject.findFirst({
    include: {
      client: true,
      blueprints: true,
      tasks: true,
      staffAllocations: { include: { employee: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    console.error("No real project found in database.");
    return;
  }

  // 2. Fetch real employee from database
  const employee = await db.employee.findFirst({
    where: { status: { in: ["ACTIVE", "INVITED"] } },
    include: { role: true },
  });

  if (!employee) {
    console.error("No real employee found in database.");
    return;
  }

  console.log(`\n[DATABASE TRUTH] Project: "${project.name}" (${project.code || "N/A"})`);
  console.log(`[DATABASE TRUTH] Employee: "${employee.fullName}" (${employee.email}) Role: ${employee.role?.name}`);

  // 3. Test HOME DATA ENGINE
  console.log("\n[01. TESTING HOME ENGINE - 'WHAT MATTERS TO ME RIGHT NOW?']...");
  const homeData = await getEmployeeOSHomeData(project.id, employee.id);
  console.log(`   Focus Work Item: [${homeData.focus?.code || "N/A"}] ${homeData.focus?.title}`);
  console.log(`   Why: "${homeData.focus?.why}"`);
  console.log(`   Momentum: 🔥 ${homeData.momentum.currentBuildStreak} Build Days | Completed Work: ${homeData.momentum.completedWorkCount}`);
  console.log(`   Waiting For You: ${homeData.waitingForYou.length} items`);
  console.log(`   You Are Waiting For: ${homeData.youAreWaitingFor.length} items`);
  console.log(`   Impact Summary: ${homeData.impact.pagesBuilt} pages, ${homeData.impact.apisConnected} APIs, ${homeData.impact.bugsVerified} verified bugs`);

  // 4. Test MY DAY PERSONAL EXECUTION
  console.log("\n[02. TESTING MY DAY PERSONAL QUEUE]...");
  const myDay = await getEmployeeMyDayData(project.id, employee.id);
  console.log(`   NOW (In Progress): ${myDay.counts.now}`);
  console.log(`   NEXT (Unblocked & Ready): ${myDay.counts.next}`);
  console.log(`   WAITING (On Upstream): ${myDay.counts.waiting}`);
  console.log(`   BLOCKED: ${myDay.counts.blocked}`);
  console.log(`   IN REVIEW: ${myDay.counts.review}`);

  // 5. Test BUILD SESSION ENGINE
  console.log("\n[03. TESTING BUILD SESSION & LIVE PROGRESS]...");
  const session = await startBuildSession({
    employeeId: employee.id,
    projectId: project.id,
    taskId: homeData.focus?.taskId,
    capabilityName: "Core Module Build",
  });
  console.log(`   Build Session Started: ID=${session.id} Status=${session.status}`);

  const ended = await endBuildSession({
    sessionId: session.id,
    whatChanged: "Engineered responsive component views and bound data props.",
    whatCompleted: "Customer interface draft",
    markTaskCompleted: false,
  });
  console.log(`   Build Session Ended: Duration=${ended.durationMinutes}m Status=${ended.status}`);

  // 6. Test DEPENDENCY RADAR
  console.log("\n[04. TESTING DEPENDENCY RADAR]...");
  const radar = await getDependencyRadarData(project.id, employee.id);
  console.log(`   I Need: ${radar.iNeed.length} contracts/schemas`);
  console.log(`   Who I Am Waiting For: ${radar.whoIAmWaitingFor.length} blockers`);
  console.log(`   Who Is Waiting For Me: ${radar.whoIsWaitingForMe.length} downstream teammates`);

  // 7. Test PROJECT DECISIONS & MEMORY
  console.log("\n[05. TESTING PROJECT MEMORY & DECISIONS]...");
  const decisions = await getProjectDecisionsData(project.id);
  console.log(`   Decisions Found: ${decisions.decisions.length}`);

  // 8. Test UNIFIED INBOX
  console.log("\n[06. TESTING NOTIFICATION INTELLIGENCE & INBOX]...");
  const inbox = await getEmployeeInboxData(employee.id);
  console.log(`   Needs Action: ${inbox.needsAction.length} | Waiting: ${inbox.waiting.length} | Unread: ${inbox.unreadCount}`);

  // 9. Test AI COACH
  console.log("\n[07. TESTING AI COACH]...");
  const coach = await askEmployeeAICoach({
    employeeId: employee.id,
    projectId: project.id,
    question: "What should I verify before submitting my work?",
  });
  console.log(`   Coach Engine: ${coach.modelUsed}`);
  console.log(`   Coach Guidance: "${coach.answer.slice(0, 100)}..."`);

  console.log("\n============================================================");
  console.log("EMPLOYEE OS 3.0 VERIFICATION COMPLETED SUCCESSFULLY!");
  console.log("============================================================");
}

verifyEmployeeOS3()
  .catch((err) => {
    console.error("Employee OS 3.0 verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

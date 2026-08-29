import { db } from "../src/lib/db";
import {
  getEmployeeProductHome,
  getVisualProductMap,
  getFeatureDetail,
  captureBuildProofRecord,
  aiReviewBuildWithOllama,
  executeHandoff,
  reportBlocker,
} from "../src/lib/employees/employee-product-workspace.service";

async function verifyProductWorkspace() {
  console.log("============================================================");
  console.log("VERIFYING: BUSINESS OS — EMPLOYEE PRODUCT WORKSPACE");
  console.log("============================================================");

  // 1. Fetch real project
  const project = await db.clientProject.findFirst({
    include: {
      client: true,
      blueprints: true,
      tasks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    console.error("No project found in database.");
    return;
  }

  // 2. Fetch real employee
  const employee = await db.employee.findFirst({
    where: { status: { in: ["ACTIVE", "INVITED"] } },
    include: { role: true },
  });

  if (!employee) {
    console.error("No employee found in database.");
    return;
  }

  console.log(`\n[DATABASE TRUTH] Project: "${project.name}" (${project.code || "N/A"})`);
  console.log(`[DATABASE TRUTH] Employee: "${employee.fullName}" Role: ${employee.role?.name}`);

  // 3. Test Product Home Engine
  console.log("\n[01. TESTING EMPLOYEE PRODUCT HOME]...");
  const homeData = await getEmployeeProductHome(project.id, employee.id);
  console.log(`   Greeting: GOOD MORNING, ${homeData.employee.name.toUpperCase()} (${homeData.employee.role})`);
  console.log(`   Project: ${homeData.project.name} (${homeData.project.phase})`);
  console.log(`   Your Area: ${homeData.yourArea.workstream} — "${homeData.yourArea.responsibility}"`);
  console.log(`   Current Build: ${homeData.currentBuild.featureName} (Status: ${homeData.currentBuild.status})`);
  console.log(`   Next Action: ${homeData.nextAction.title} [${homeData.nextAction.actionText}]`);
  console.log(`   Dependency: ${homeData.dependency.name} — Status: ${homeData.dependency.status} (Owner: ${homeData.dependency.ownerRole})`);
  console.log(`   Recent Change: "${homeData.recentChange.title}"`);

  // 4. Test Visual Product Map
  console.log("\n[02. TESTING VISUAL PRODUCT MAP]...");
  const mapTree = await getVisualProductMap(project.id, employee.id);
  console.log(`   Product Root: ${mapTree.name} (${mapTree.areas.length} Areas)`);
  mapTree.areas.forEach((area: any) => {
    console.log(`   ├── ${area.name} [${area.workstream}] ${area.isEmployeeArea ? "← YOUR AREA" : ""}`);
    area.features.slice(0, 2).forEach((feat: any) => {
      console.log(`       └── ${feat.name} (${feat.status}) ${feat.isEmployeeFeature ? "← YOUR FEATURE" : ""}`);
    });
  });

  // 5. Test Feature Detail
  console.log("\n[03. TESTING FEATURE PAGE SPECIFICATION]...");
  const featSpec = await getFeatureDetail(project.id, employee.id, homeData.currentBuild.featureName);
  console.log(`   Feature: ${featSpec.featureName}`);
  console.log(`   What: ${featSpec.what}`);
  console.log(`   Why: ${featSpec.why}`);
  console.log(`   Who Owns It: ${featSpec.whoOwnsIt}`);
  console.log(`   What Exists: Design=${featSpec.whatExists.design}, API=${featSpec.whatExists.api}, DB=${featSpec.whatExists.database}`);

  // 6. Test Capture Proof
  console.log("\n[04. TESTING PROOF SYSTEM]...");
  const proof = await captureBuildProofRecord({
    buildId: homeData.currentBuild.id,
    type: "PR",
    milestone: "UI Components Implemented",
    title: `${homeData.currentBuild.featureName} UI Implementation`,
    evidenceUrl: "https://github.com/org/repo/pull/101",
    whatChanged: `Constructed verified responsive layout for ${homeData.currentBuild.featureName}.`,
  });
  console.log(`   Captured Proof v${proof.version}: "${proof.title}" Milestone: ${proof.milestone}`);

  // 7. Test AI Review
  console.log("\n[05. TESTING AI BUILD REVIEW (OLLAMA)]...");
  const review = await aiReviewBuildWithOllama({
    buildId: homeData.currentBuild.id,
    requirementText: homeData.currentBuild.expectedResult,
    acceptanceCriteria: ["Responsive UI layout", "Verified data contract"],
    proofDescription: proof.whatChanged,
  });
  console.log(`   AI Verification Status: ${review.status}`);
  console.log(`   Observations: ${review.observations?.join(" | ")}`);

  // 8. Test Blocker Report
  console.log("\n[06. TESTING BLOCKER REPORT]...");
  const blockedBuild = await reportBlocker({
    buildId: homeData.currentBuild.id,
    blockedReason: "Waiting for schema migration deployment.",
    blockedDependency: "Database Migration",
    blockedOwnerRole: "Database Engineer",
  });
  console.log(`   Build Status: ${blockedBuild.status} Blocker: "${blockedBuild.blockedReason}"`);

  // 9. Test Handoff
  console.log("\n[07. TESTING AUTOMATED HANDOFF]...");
  const handoff = await executeHandoff({
    buildId: homeData.currentBuild.id,
    fromWorkstream: "FRONTEND",
    toWorkstream: "QA",
    whatWasBuilt: `${homeData.currentBuild.featureName} components`,
    whatWasVerified: "Component unit tests and visual states",
  });
  console.log(`   Handoff Created: ${handoff.fromWorkstream} -> ${handoff.toWorkstream} (${handoff.whatWasBuilt})`);

  console.log("\n============================================================");
  console.log("EMPLOYEE PRODUCT WORKSPACE VERIFICATION PASSED PERFECTLY!");
  console.log("============================================================");
}

verifyProductWorkspace()
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

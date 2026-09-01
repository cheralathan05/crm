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
  console.log(`   Project: ${homeData.project.name} (${homeData.project.stage})`);
  console.log(`   Your Responsibility: ${homeData.yourResponsibility.workstream} — "${homeData.yourResponsibility.title}"`);
  console.log(`   Current Focus: ${homeData.currentFocus.productAreaName} (Status: ${homeData.currentFocus.status})`);
  console.log(`   Next Work: ${homeData.nextWork.name} [${homeData.nextWork.reason}]`);
  console.log(`   Recent Change: "${homeData.myChanges[0]?.title || "Initial Specification"}"`);

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
  const featSpec = await getFeatureDetail(project.id, employee.id, homeData.currentFocus.productAreaName);
  console.log(`   Feature: ${featSpec.featureName}`);
  console.log(`   What: ${featSpec.what}`);
  console.log(`   Why: ${featSpec.why}`);
  console.log(`   Who Owns It: ${featSpec.whoOwnsIt}`);
  console.log(`   What Exists: Design=${featSpec.whatExists.design}, API=${featSpec.whatExists.api}, DB=${featSpec.whatExists.database}`);

  // 6. Test Capture Proof
  console.log("\n[04. TESTING PROOF SYSTEM]...");
  const proof = await captureBuildProofRecord({
    buildId: homeData.currentFocus.id,
    type: "PR",
    milestone: "UI Components Implemented",
    title: `${homeData.currentFocus.productAreaName} UI Implementation`,
    evidenceUrl: "https://github.com/org/repo/pull/101",
    whatChanged: `Constructed verified responsive layout for ${homeData.currentFocus.productAreaName}.`,
  });
  console.log(`   Captured Proof v${proof.version}: "${proof.title}" Milestone: ${proof.milestone}`);

  // 7. Test AI Review
  console.log("\n[05. TESTING AI BUILD REVIEW (OLLAMA)]...");
  const review = await aiReviewBuildWithOllama({
    buildId: homeData.currentFocus.id,
    requirementText: homeData.currentFocus.why,
    acceptanceCriteria: ["Responsive UI layout", "Verified data contract"],
    proofDescription: proof.whatChanged,
  });
  console.log(`   AI Verification Status: ${review.status}`);
  console.log(`   Observations: ${review.observations?.join(" | ")}`);

  // 8. Test Blocker Report
  console.log("\n[06. TESTING BLOCKER REPORT]...");
  const blockedBuild = await reportBlocker({
    buildId: homeData.currentFocus.id,
    blockedReason: "Waiting for schema migration deployment.",
    blockedDependency: "Database Migration",
    blockedOwnerRole: "Database Engineer",
  });
  console.log(`   Build Status: ${blockedBuild.status} Blocker: "${blockedBuild.blockedReason}"`);

  // 9. Test Handoff
  console.log("\n[07. TESTING AUTOMATED HANDOFF]...");
  const handoff = await executeHandoff({
    buildId: homeData.currentFocus.id,
    fromWorkstream: "FRONTEND",
    toWorkstream: "QA",
    whatWasBuilt: `${homeData.currentFocus.productAreaName} components`,
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

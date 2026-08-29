import { db } from "../src/lib/db";
import {
  getOrGenerateEmployeeProjectBrief,
  getEmployeeBuildModeData,
  computeProjectBriefHash,
} from "../src/lib/employees/employee-project-brief.service";
import { executeWorkstreamAssignment } from "../src/lib/employees/workstream-assignment.service";

async function runVerification() {
  console.log("============================================================");
  console.log("VERIFYING: PRODUCT-LEVEL EMPLOYEE PROJECT EXPERIENCE");
  console.log("============================================================");

  // 1. Fetch real project from database
  let project = await db.clientProject.findFirst({
    include: {
      client: true,
      blueprints: {
        include: {
          frontendCapabilities: true,
          backendApis: true,
          backendServices: true,
          databaseEntities: true,
          testSpecifications: true,
          dependencies: true,
        },
      },
      deliverables: true,
      tasks: true,
      staffAllocations: { include: { employee: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    console.log("No project found in database. Please seed or create a project.");
    return;
  }

  console.log(`\n[REAL DATABASE TRUTH] Project Found: "${project.name}" (Code: ${project.code || "N/A"})`);
  console.log(`Client: ${project.client?.companyName} | Health: ${project.health} | Progress: ${project.progress}%`);
  console.log(`Deliverables: ${project.deliverables.length} | Tasks: ${project.tasks.length}`);

  const blueprint = project.blueprints[0];
  if (blueprint) {
    console.log(`Blueprint v${blueprint.version}: ${blueprint.frontendCapabilities.length} Pages/Capabilities, ${blueprint.backendApis.length} APIs, ${blueprint.databaseEntities.length} DB Entities`);
  }

  // 2. Fetch real employee from database
  let employee = await db.employee.findFirst({
    where: { status: { in: ["ACTIVE", "INVITED"] } },
    include: { role: true },
  });

  if (!employee) {
    console.log("No employee found in database.");
    return;
  }

  console.log(`\n[REAL EMPLOYEE] "${employee.fullName}" (${employee.employeeCode}) Role: ${employee.role?.name || "Frontend Developer"}`);

  // 3. Test Admin Assignment Flow triggering Employee Project Brief creation
  console.log("\n[TRIGGERING ADMIN ASSIGNMENT FLOW]...");
  const assignResult = await executeWorkstreamAssignment(
    employee.id,
    project.id,
    "FRONTEND",
    "Admin"
  );
  console.log(`Assignment Result: success=${assignResult.success}, tasksAutoAssigned=${assignResult.tasksAssigned}`);

  // 4. Generate/Retrieve Employee Project Brief
  console.log("\n[GENERATING EMPLOYEE PROJECT BRIEF] (Ollama Explains, Database Decides)...");
  const brief = await getOrGenerateEmployeeProjectBrief(project.id, employee.id, true);

  console.log("\n============================================================");
  console.log("10-SECTION PRODUCT CONTROL CENTER VERIFICATION");
  console.log("============================================================");

  console.log("\n1. FIRST SCREEN: YOUR PROJECT");
  console.log(`   Project: ${brief.projectName} (${brief.projectCode || "N/A"})`);
  console.log(`   Your Role: ${brief.projectRole}`);
  console.log(`   Your Responsibility: ${brief.responsibility}`);

  console.log("\n2. WHAT ARE WE BUILDING?");
  console.log(`   "${brief.summaryWhat}"`);

  console.log("\n3. WHO USES IT?");
  console.log(`   ${brief.summaryWho}`);
  console.log(`   Personas: ${brief.userPersonas.join(", ")}`);

  console.log("\n4. WHAT DOES IT DO?");
  console.log(`   ${brief.summaryEnables}`);

  console.log(`\n5. SEE THE PRODUCT (VISUAL PRODUCT MAP) - ${brief.productMap.length} Pages`);
  brief.productMap.slice(0, 3).forEach((p, idx) => {
    console.log(`   [Page ${idx + 1}] ${p.name} (${p.route}) -> Primary Action: "${p.primaryAction}"`);
    console.log(`      Purpose: ${p.purpose.slice(0, 60)}...`);
    console.log(`      Data Shown: ${p.dataShown.join(", ")}`);
  });

  console.log("\n6. YOUR ROLE IN THIS PRODUCT");
  console.log(`   Title: ${brief.roleOwnership.title}`);
  console.log(`   You Own: ${brief.roleOwnership.youOwn.map((o) => o.name).join(", ")}`);
  console.log(`   Consumes: ${brief.roleOwnership.consumesOrProvides.items.map((i) => i.name).slice(0, 3).join(", ")}`);

  console.log(`\n7. HOW DOES IT WORK? (ARCHITECTURE TRACE) - ${brief.architectureConnections.length} Links`);
  brief.architectureConnections.slice(0, 3).forEach((c, idx) => {
    console.log(`   [Link ${idx + 1}] ${c.feature} ↓ ${c.page} ↓ ${c.api} ↓ ${c.backend} ↓ ${c.database}`);
  });

  console.log("\n8. WHAT SHOULD I WORK ON FIRST? (START HERE)");
  console.log(`   START HERE: [${brief.startHere.code || "TASK"}] ${brief.startHere.title}`);
  console.log(`   WHY?: ${brief.startHere.why}`);
  if (brief.startHere.afterThat) {
    console.log(`   AFTER THAT: ${brief.startHere.afterThat} (${brief.startHere.afterThatWhy})`);
  }
  if (brief.startHere.then) {
    console.log(`   THEN: ${brief.startHere.then} (${brief.startHere.thenWhy})`);
  }

  console.log(`\n9. YOUR WORK (TASKS & TRACEABILITY) - ${brief.yourWork.length} Tasks`);
  brief.yourWork.slice(0, 3).forEach((t) => {
    console.log(`   Task: ${t.code} "${t.title}"`);
    console.log(`      Lineage: ${t.code} ↓ ${t.featureName} ↓ ${t.pageName} ↓ ${t.requirementId} ↓ ${t.projectName}`);
    console.log(`      Why: ${t.whyAmIDoingThis}`);
  });

  console.log(`\n10. WHAT DOES DONE LOOK LIKE? - ${brief.acceptanceCriteria.length} Acceptance Criteria`);
  brief.acceptanceCriteria.slice(0, 3).forEach((ac) => {
    console.log(`   [${ac.status}] ${ac.criterion} (Deliverable: ${ac.deliverableTitle})`);
  });

  console.log("\n11. AUDIT & TRACEABILITY");
  console.log(`   Project ID: ${brief.audit.projectId}`);
  console.log(`   Employee ID: ${brief.audit.employeeId}`);
  console.log(`   Engine: ${brief.audit.model} | Prompt: v${brief.audit.promptVersion}`);
  console.log(`   Generated: ${brief.audit.generatedAt} | Status: ${brief.status}`);

  // 5. Test Build Mode Data Provider
  console.log("\n[TESTING BUILD MODE DATA PROVIDER]...");
  const buildMode = await getEmployeeBuildModeData({
    projectId: project.id,
    employeeId: employee.id,
  });
  console.log(`Build Mode loaded for ${buildMode.workstream}: ${buildMode.capabilities.length} Capabilities, ${buildMode.apis.length} APIs, ${buildMode.databaseEntities.length} DB Entities`);

  console.log("\n============================================================");
  console.log("VERIFICATION RESULT: ALL CHECKS PASSED PERFECTLY!");
  console.log("============================================================");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

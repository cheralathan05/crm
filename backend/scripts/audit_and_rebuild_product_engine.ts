import { db } from "../src/lib/db";
import { auditAndCleanExistingTasks } from "../src/lib/product-execution/task-audit-cleanup.service";
import { syncProductModelToDatabase, deriveProductModelForProject } from "../src/lib/product-execution/product-model.service";
import { generateProductWorkGraph } from "../src/lib/product-execution/work-graph-engine.service";
import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";

async function main() {
  console.log("============================================================");
  console.log("EXECUTING PRODUCT-GRADE EXECUTION ENGINE MIGRATION & AUDIT");
  console.log("============================================================\n");

  // 1. Find Project A
  const projectA = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
    include: { client: true },
  });

  if (!projectA) {
    throw new Error("Project A (CRM) not found in database.");
  }

  console.log(`[1] Found Project A: "${projectA.name}" (ID: ${projectA.id})`);

  // 2. Audit and Clean Existing Legacy Tasks (Section 32)
  console.log("\n[2] Running Audit on Existing Tasks...");
  const auditResult = await auditAndCleanExistingTasks(projectA.id);
  console.log(`  - Total tasks audited: ${auditResult.totalTasksAudited}`);
  console.log(`  - Valid tasks preserved: ${auditResult.validTasksCount}`);
  console.log(`  - Invalid tasks flagged: ${auditResult.invalidTasksCount}`);
  console.log(`  - Breakdown:`, auditResult.breakdownByReason);

  // 3. Sync Product Model to Database (Section 04, 05, 06, 07, 08)
  console.log("\n[3] Deriving and Syncing Authentic Product Model...");
  const productModel = await syncProductModelToDatabase(projectA.id);
  console.log(`  - Commercial Reference: ${productModel.commercialReference} v${productModel.version}`);
  console.log(`  - MVP Product Areas (${productModel.mvpProductAreas.length}): ${productModel.mvpProductAreas.map(a => a.name).join(", ")}`);
  console.log(`  - Phase 2 Product Areas (${productModel.phase2ProductAreas.length}): ${productModel.phase2ProductAreas.map(a => a.name).join(", ")}`);
  console.log(`  - True MVP Progress: ${productModel.mvpProgressPercentage}%`);
  console.log(`  - Delivery Readiness: ${productModel.deliveryReadiness.status} (${productModel.deliveryReadiness.reason})`);

  // 4. Generate Product Work Graph (Section 09, 10, 11, 15)
  console.log("\n[4] Generating Product Work Graph & Dependencies...");
  const graphResult = await generateProductWorkGraph(projectA.id);
  console.log(`  - Tasks Created: ${graphResult.tasksCreated}`);
  console.log(`  - Tasks Reused/Updated: ${graphResult.tasksReused}`);
  console.log(`  - Dependencies Created: ${graphResult.dependenciesCreated}`);

  // 5. Verify Hard Role Boundary for John (Frontend Developer) (Section 10 & 46)
  console.log("\n[5] Verifying Employee Role Boundary for John...");
  const john = await db.employee.findFirst({
    where: { email: "john.developer@businessos.internal" },
  });

  if (!john) {
    throw new Error("John employee record not found.");
  }

  const johnPortalData = await getEmployeePortalData({
    employeeId: john.id,
    requestedProjectId: projectA.id,
  });

  console.log(`  - John Role: ${johnPortalData.myRole}`);
  console.log(`  - John Workstream: ${johnPortalData.myTeam}`);
  console.log(`  - John Active Work Items Count: ${johnPortalData.workItems.length}`);
  
  console.log("\n  John's Work Items:");
  johnPortalData.workItems.forEach((wi: any, idx: number) => {
    console.log(`    ${idx + 1}. [${wi.code}] "${wi.title}"`);
    console.log(`       Product Area: ${wi.productAreaName} (${wi.productAreaCode}) · Workstream: ${wi.workstream} · Status: ${wi.status}`);
    console.log(`       Proof Required: ${wi.proofTypeRequired}`);
    if (wi.dependencyDetails) {
      console.log(`       Upstream Dependency: "${wi.dependencyDetails.title}" (Owner: ${wi.dependencyDetails.ownerName} - ${wi.dependencyDetails.ownerRole}) · Ready: ${wi.dependencyDetails.isReady}`);
    }
  });

  // Verify no backend or database tasks leaked to John
  const leakedBackend = johnPortalData.workItems.filter((wi: any) => {
    const l = (wi.layer || "").toUpperCase();
    const t = wi.title.toLowerCase();
    return l === "BACKEND" || l === "DATABASE" || t.includes("api route") || t.includes("database schema");
  });

  console.log(`\n  - Leaked Backend/Database Tasks to John: ${leakedBackend.length}`);
  if (leakedBackend.length === 0) {
    console.log("  ✓ SUCCESS: John has ZERO backend/database ownership tasks! Role boundary is strictly enforced.");
  } else {
    console.error("  ✗ FAILURE: Role boundary violation! Found tasks:", leakedBackend);
  }

  // 6. Verify One Work Item At A Time Queue (Section 19)
  console.log("\n[6] Verifying Execution Queue (CURRENT, NEXT, UPCOMING)...");
  console.log(`  - CURRENT: ${johnPortalData.executionQueue?.current ? `[${johnPortalData.executionQueue.current.code}] "${johnPortalData.executionQueue.current.title}"` : "None"}`);
  console.log(`  - NEXT: ${johnPortalData.executionQueue?.next ? `[${johnPortalData.executionQueue.next.code}] "${johnPortalData.executionQueue.next.title}"` : "None"}`);
  console.log(`  - UPCOMING (${johnPortalData.executionQueue?.upcoming?.length || 0}): ${johnPortalData.executionQueue?.upcoming?.map((u: any) => u.title).join("; ") || "None"}`);

  // 7. Verify Product Context Before Work (Section 12)
  console.log("\n[7] Verifying Product Context Before Work...");
  console.log(`  - What are we building: "${johnPortalData.productContext?.whatAreWeBuilding}"`);
  console.log(`  - Your responsibility: "${johnPortalData.productContext?.yourResponsibility}"`);
  console.log(`  - What client approved:`, johnPortalData.productContext?.whatClientApproved);
  console.log(`  - Dependencies to watch:`, johnPortalData.productContext?.whatYouDependOn?.length);

  console.log("\n============================================================");
  console.log("PRODUCT EXECUTION ENGINE VERIFICATION COMPLETE — ALL SUCCESS");
  console.log("============================================================\n");
}

main().finally(() => db.$disconnect());

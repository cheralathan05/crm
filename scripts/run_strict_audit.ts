import { auditAndCleanExistingTasks } from "../src/lib/product-execution/task-audit-cleanup.service";
import { db } from "../src/lib/db";

async function main() {
  const project = await db.clientProject.findFirst({ where: { name: { contains: "CRM" } } });
  if (!project) throw new Error("No CRM project found");

  console.log("=== RUNNING STRICT TASK AUDIT ON PROJECT ===", project.name);
  const result = await auditAndCleanExistingTasks(project.id);
  console.log("Audit Result:", {
    totalAudited: result.totalTasksAudited,
    validTasks: result.validTasksCount,
    invalidTasks: result.invalidTasksCount,
    breakdown: result.breakdownByReason,
  });

  const remainingValid = await db.clientTask.findMany({
    where: { projectId: project.id, isInvalidWork: false },
    select: { code: true, title: true, workstream: true, layer: true, assigneeName: true, phase: true },
  });
  console.log("\n=== REMAINING VALID AUTHENTIC PRODUCT TASKS ===", remainingValid.length);
  for (const t of remainingValid) {
    console.log(`[${t.code}] ${t.title} (${t.phase}) | WS:${t.workstream} | Assignee:${t.assigneeName}`);
  }
}

main().catch(console.error);

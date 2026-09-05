import { db } from "../src/lib/db";
import { activateDependentWork, raiseProjectBlocker, resolveProjectBlocker } from "../src/lib/product-execution/lifecycle-activation.service";

async function main() {
  console.log("=== TESTING AUTOMATIC ACTIVATION & BLOCKER ENGINE ===");

  // Find a task with dependencies
  const taskWithDep = await db.clientTask.findFirst({
    where: {
      dependencies: { some: {} },
    },
    include: {
      dependencies: { include: { dependsOnTask: true } },
    },
  });

  if (!taskWithDep) {
    console.log("No task with dependencies found.");
    return;
  }

  const upstreamTask = taskWithDep.dependencies[0].dependsOnTask;
  console.log(`Testing with downstream task: [${taskWithDep.code}] "${taskWithDep.title}" (Status: ${taskWithDep.status})`);
  console.log(`Upstream task: [${upstreamTask.code}] "${upstreamTask.title}" (Status: ${upstreamTask.status})`);

  // 1. Test Raising Blocker
  console.log("\n[1] Testing Blocker Engine...");
  const blocker = await raiseProjectBlocker({
    projectId: taskWithDep.projectId!,
    productAreaId: taskWithDep.productAreaId || undefined,
    taskId: taskWithDep.id,
    dependencyId: upstreamTask.id,
    reason: `Waiting for ${upstreamTask.title} implementation contract`,
    raisedById: "test-user",
    raisedByName: "John Developer",
  });
  console.log("Blocker created:", { id: blocker.id, reason: blocker.reason, status: blocker.status });

  const blockedTask = await db.clientTask.findUnique({ where: { id: taskWithDep.id } });
  console.log(`Task status after blocker: ${blockedTask?.status} (Execution State: ${blockedTask?.executionState})`);

  // 2. Test Resolving Blocker
  console.log("\n[2] Testing Blocker Resolution...");
  await resolveProjectBlocker(blocker.id);
  const unblockedTask = await db.clientTask.findUnique({ where: { id: taskWithDep.id } });
  console.log(`Task status after resolving blocker: ${unblockedTask?.status} (Execution State: ${unblockedTask?.executionState})`);

  // 3. Test Automatic Activation upon Upstream Approval
  console.log("\n[3] Testing Automatic Upstream Approval & Activation...");
  // Mark upstream task as COMPLETED / APPROVED
  await db.clientTask.update({
    where: { id: upstreamTask.id },
    data: { status: "COMPLETED", executionState: "APPROVED" },
  });

  const activationResult = await activateDependentWork(upstreamTask.id);
  console.log("Activation result:", activationResult);

  const refreshedTask = await db.clientTask.findUnique({ where: { id: taskWithDep.id } });
  console.log(`Downstream task status after upstream approval: ${refreshedTask?.status} (Execution State: ${refreshedTask?.executionState})`);

  console.log("\n✓ SUCCESS: Automatic Activation & Blocker engine verified!");
}

main().finally(() => db.$disconnect());

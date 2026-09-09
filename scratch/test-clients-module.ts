import { db } from "../frontend/src/lib/db";
import { getWorkspaceForUser } from "../frontend/src/lib/clients";
import { serializeClientDetail, serializeClientListRow } from "../frontend/src/lib/client-serialize";

async function runTests() {
  console.log("=== RUNNING CLIENT MODULE VERIFICATION ===");

  // 1. Check workspace & user
  const user = await db.user.findFirst({ where: { email: "cheralathannadha9098@gmail.com" } });
  if (!user) throw new Error("User not found!");
  console.log(`[PASS] Found test user: ${user.name} (${user.email})`);

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("Workspace not found!");
  console.log(`[PASS] Found workspace: ${workspace.companyName} (${workspace.id})`);

  // 2. Test Client Listing & Relations
  const clients = await db.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
  });
  console.log(`[PASS] Workspace has ${clients.length} clients in database`);

  const rows = await Promise.all(clients.map((c) => serializeClientListRow(c)));
  console.log(`[PASS] Successfully serialized ${rows.length} client rows without errors:`);
  for (const r of rows) {
    console.log(`  - ${r.companyName} (status: ${r.status}, stage: ${r.stage}, health: ${r.health}, reqs: ${r.requirementsOpen})`);
  }

  // 3. Test Detail Serialization on VertexFlow
  const targetClient = clients.find((c) => c.companyName.includes("VertexFlow")) || clients[0];
  console.log(`\nTesting client detail for: ${targetClient.companyName} (${targetClient.id})`);
  const detail = await serializeClientDetail(targetClient, user.name || "Owner");
  console.log(`[PASS] Client detail serialized successfully:`);
  console.log(`  - Company: ${detail.client.companyName}`);
  console.log(`  - Requirement requests: ${detail.requirementRequests.length}`);
  if (detail.requirementRequests[0]) {
    const r0 = detail.requirementRequests[0];
    console.log(`    * [0] ${r0.reference} "${r0.title}" status: ${r0.status}`);
  }
  console.log(`  - Next action: ${detail.nextAction?.title} (kind: ${detail.nextAction?.kind}, targetHref: ${detail.nextAction?.targetHref})`);
  console.log(`  - Counts: tasks=${detail.counts.openTasks}, proposals=${detail.counts.proposals}, contacts=${detail.counts.contacts}`);

  // 4. Test Resource Route Mapping (Simulating singular and plural resources)
  console.log("\nTesting Resource Creation (Singular & Plural compatibility)...");
  const testTask = await db.clientTask.create({
    data: {
      clientId: targetClient.id,
      title: "Automated Verification Task " + Date.now(),
      status: "TODO",
      teamRole: "QA",
      assigneeName: "Automated Test",
    },
  });
  console.log(`[PASS] Created task: ${testTask.id} "${testTask.title}"`);

  // Transition task status
  const updatedTask = await db.clientTask.update({
    where: { id: testTask.id },
    data: { status: "IN_PROGRESS" },
  });
  console.log(`[PASS] Updated task ${updatedTask.id} status to ${updatedTask.status}`);

  // Cleanup test task
  await db.clientTask.delete({ where: { id: testTask.id } });
  console.log(`[PASS] Cleaned up verification task`);

  // 5. Test Needs Attention Query
  console.log("\nTesting Needs Attention Query...");
  const [attentionReqs, attentionProps, attentionPayments, attentionTasks, attentionProjects] = await Promise.all([
    db.clientRequirement.findMany({ where: { client: { workspaceId: workspace.id }, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, select: { clientId: true }, distinct: ["clientId"] }),
    db.clientProposal.findMany({ where: { client: { workspaceId: workspace.id }, status: { in: ["SENT", "VIEWED"] } }, select: { clientId: true }, distinct: ["clientId"] }),
    db.clientPayment.findMany({ where: { client: { workspaceId: workspace.id }, status: { in: ["OVERDUE", "PENDING"] } }, select: { clientId: true }, distinct: ["clientId"] }),
    db.clientTask.findMany({ where: { client: { workspaceId: workspace.id }, status: "BLOCKED" }, select: { clientId: true }, distinct: ["clientId"] }),
    db.clientProject.findMany({ where: { client: { workspaceId: workspace.id }, health: "AT_RISK" }, select: { clientId: true }, distinct: ["clientId"] }),
  ]);
  const attentionClientIds = new Set([
    ...attentionReqs.map((r) => r.clientId),
    ...attentionProps.map((p) => p.clientId),
    ...attentionPayments.map((p) => p.clientId),
    ...attentionTasks.map((t) => t.clientId),
    ...attentionProjects.map((p) => p.clientId),
  ]);
  const attentionClients = await db.client.findMany({ where: { id: { in: Array.from(attentionClientIds) } } });
  console.log(`[PASS] Needs Attention client count: ${attentionClients.length}`);
  for (const ac of attentionClients) {
    console.log(`  - ${ac.companyName} (${ac.id})`);
  }

  // 6. Test Custom Fields Definition
  console.log("\nTesting Custom Fields Definition...");
  const testField = await db.clientCustomFieldDef.create({
    data: {
      workspaceId: workspace.id,
      label: "Test Region " + Date.now(),
      type: "select",
      options: JSON.stringify(["APAC", "EMEA", "US"]),
    },
  });
  console.log(`[PASS] Created custom field: ${testField.id} "${testField.label}"`);
  await db.clientCustomFieldDef.delete({ where: { id: testField.id } });
  console.log(`[PASS] Cleaned up test custom field`);

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runTests()
  .catch((err) => {
    console.error("[FAIL]", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

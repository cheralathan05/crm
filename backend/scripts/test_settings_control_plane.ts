import { db } from "../src/lib/db";
import {
  ensureWorkspaceSettings,
  getSetting,
  getAllSettings,
  setSetting,
  rollbackSetting,
  getConfigurationHistory,
} from "../src/lib/settings/settings-control.service";
import { calculateChangePreview } from "../src/lib/settings/change-preview.service";
import { simulateConfigurationChange } from "../src/lib/settings/config-simulator.service";
import { simulateAccess } from "../src/lib/settings/access-simulator.service";
import { evaluateControlPlaneHealth } from "../src/lib/settings/control-plane-health.service";
import { createApiKey, listApiKeys } from "../src/lib/settings/api-key-webhook.service";
import {
  createAutomationRule,
  executeAutomationRule,
  listAutomationRules,
} from "../src/lib/settings/automation-engine.service";

async function main() {
  console.log("==================================================");
  console.log("RUNNING SETTINGS CONTROL PLANE BACKEND VERIFICATION");
  console.log("==================================================");

  const workspace = await db.workspace.findFirst();
  if (!workspace) throw new Error("No workspace found in dev.db");
  const workspaceId = workspace.id;
  console.log(`[1] Active Workspace: ${workspace.companyName} (${workspaceId})`);

  // 1. Ensure Workspace Settings
  console.log("\n[2] Testing ensureWorkspaceSettings & getAllSettings...");
  await ensureWorkspaceSettings(workspaceId);
  const allSettings = await getAllSettings(workspaceId);
  console.log(`✓ Resolved ${allSettings.length} settings in registry.`);
  if (allSettings.length < 10) throw new Error("Expected at least 10 settings");

  // 2. Test Change Preview
  console.log("\n[3] Testing Change Preview Engine...");
  const preview = await calculateChangePreview(
    workspaceId,
    "security.mfa_enforcement",
    "MANDATORY"
  );
  console.log("✓ Change Preview Result:", {
    key: preview.key,
    risk: preview.risk,
    affectedUsers: preview.impact.affectedUsers,
    affectedProjects: preview.impact.affectedProjects,
    requiresConfirmation: preview.requiresConfirmation,
    dependencies: preview.dependencies,
  });

  // 3. Test Configuration Simulator
  console.log("\n[4] Testing Configuration Simulator (Non-destructive)...");
  const sim = await simulateConfigurationChange(
    workspaceId,
    "workflow.proof_review_required",
    true
  );
  console.log("✓ Simulation Result:", {
    scenario: sim.scenario,
    isSafe: sim.isSafe,
    affectedWorkflows: sim.affectedWorkflowsCount,
    blockedActions: sim.impactDetails.blockedActions.slice(0, 2),
  });

  // 4. Test Access Simulator
  console.log("\n[5] Testing Access Simulator (RBAC Trace)...");
  const employee = await db.employee.findFirst({ where: { workspaceId } });
  const accessResult = await simulateAccess({
    workspaceId,
    employeeId: employee?.id,
    module: "PAYMENTS",
    action: "APPROVE",
  });
  console.log("✓ Access Decision:", {
    principal: accessResult.principal.name,
    decision: accessResult.decision,
    reason: accessResult.reason,
    traceSteps: accessResult.permissionTrace.length,
  });

  // 5. Test Transactional SetSetting, History & Rollback
  console.log("\n[6] Testing Transactional SetSetting, Versioning & Rollback...");
  const testKey = "general.date_format";
  const initialSetting = await getSetting(workspaceId, testKey);
  const initialVal = initialSetting?.currentValue;
  console.log(`Initial ${testKey} = ${initialVal} (v${initialSetting?.version})`);

  // Set new value
  const updateRes = await setSetting(
    workspaceId,
    testKey,
    "YYYY-MM-DD",
    { id: workspace.ownerId, name: "Cheralathan", role: "OWNER" },
    "Test automated format update"
  );
  console.log(`✓ Updated to YYYY-MM-DD. Result: v${updateRes.version}`);

  const history = await getConfigurationHistory(workspaceId, testKey);
  console.log(`✓ Version history count: ${history.length} snapshots`);

  // Rollback to prior version if needed
  if (initialSetting && initialSetting.version) {
    const rollbackRes = await rollbackSetting(
      workspaceId,
      testKey,
      initialSetting.version,
      { id: workspace.ownerId, name: "Cheralathan" }
    );
    console.log(`✓ Rollback Result: new version v${rollbackRes.newVersion}`);
  }

  // 6. Test Control Plane Health
  console.log("\n[7] Testing Control Plane Health Engine...");
  const health = await evaluateControlPlaneHealth(workspaceId);
  console.log("✓ Health Check Result:", {
    overall: health.overall,
    readinessScore: health.readiness.readinessScore,
    security: health.subsystems.security.status,
    access: health.subsystems.access.status,
    email: health.subsystems.email.status,
    requiresAttentionCount: health.requiresAttention.length,
    recommendationsCount: health.recommendations.length,
  });

  // 7. Test API Key creation
  console.log("\n[8] Testing Developer API Key Cryptographic Creation...");
  const apiKeyResult = await createApiKey({
    workspaceId,
    name: "Automated Test Key",
    scopes: ["read:tasks", "read:projects"],
    actor: { id: workspace.ownerId, name: "Cheralathan" },
  });
  console.log("✓ API Key created:", {
    prefix: apiKeyResult.apiKey.keyPrefix,
    rawSecretReturned: !!apiKeyResult.rawSecretKey,
  });

  // 8. Test Automation Engine
  console.log("\n[9] Testing Automation Engine...");
  const existingRules = await listAutomationRules(workspaceId);
  let testRule: any = existingRules[0];
  if (!testRule) {
    testRule = await createAutomationRule({
      workspaceId,
      name: "Payment Confirmation Receipt Dispatcher",
      triggerEvent: "payment.confirmed",
      conditions: [{ field: "amount", operator: "greater_than", value: "0" }],
      actions: [{ type: "GENERATE_RECEIPT" }, { type: "NOTIFY_CLIENT" }],
      actor: { id: workspace.ownerId, name: "Cheralathan" },
    });
    console.log("✓ Created automation rule:", testRule.name);
  }

  const runResult = await executeAutomationRule(testRule.id, {
    paymentId: "pay_test_123",
    amount: 500,
  });
  console.log("✓ Automation executed. Run status:", runResult.status);

  console.log("\n==================================================");
  console.log("ALL SETTINGS CONTROL PLANE BACKEND SERVICES PASSED!");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));

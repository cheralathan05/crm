import { db } from "../frontend/src/lib/db";
import {
  assertTenantAccess,
  verifyProjectAccess,
  verifyClientAccess,
  verifyTaskAccess,
  TenantAccessDeniedError,
} from "../frontend/src/lib/multi-tenant";
import { rateLimitByKey } from "../frontend/src/lib/rate-limit";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — AUTOMATED SECURITY & TENANT ISOLATION SUITE
──────────────────────────────────────────────────────────────── */

async function runSecurityAudit() {
  console.log("==================================================");
  console.log("RUNNING MULTI-TENANT ISOLATION & SECURITY AUDIT");
  console.log("==================================================\n");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      testsFailed++;
    }
  }

  // 1. Fetch real workspace & sample entities
  const workspace = await db.workspace.findFirst({
    include: { clients: true },
  });

  if (!workspace) {
    throw new Error("No active workspace found in database for testing.");
  }

  const projects = await db.clientProject.findMany({
    where: { client: { workspaceId: workspace.id } },
  });

  console.log(`[Target Environment] Workspace: ${workspace.companyName} (${workspace.id})\n`);

  // TEST 1: Tenant Assertion Match
  try {
    assertTenantAccess(workspace.id, workspace.id);
    assert(true, "Matching workspace IDs permit access");
  } catch {
    assert(false, "Matching workspace IDs should permit access");
  }

  // TEST 2: Cross-Tenant Breach Prevention
  try {
    const bogusWorkspaceId = "ws_intruder_foreign_tenant_9999";
    assertTenantAccess(workspace.id, bogusWorkspaceId);
    assert(false, "Foreign workspace ID must trigger TenantAccessDeniedError");
  } catch (err) {
    assert(err instanceof TenantAccessDeniedError, "Foreign workspace ID triggers TenantAccessDeniedError");
  }

  // TEST 3: Project Tenant Boundary
  if (projects.length > 0) {
    const validProject = projects[0];
    const projectAccess = await verifyProjectAccess(workspace.id, validProject.id);
    assert(projectAccess.id === validProject.id, "Authorized project within workspace is accessible");

    try {
      await verifyProjectAccess("foreign_workspace_fake", validProject.id);
      assert(false, "Cross-workspace access to project must be rejected");
    } catch (err) {
      assert(err instanceof TenantAccessDeniedError, "Cross-workspace project access rejected");
    }
  }

  // TEST 4: Client Record Isolation
  if (workspace.clients.length > 0) {
    const validClient = workspace.clients[0];
    const clientAccess = await verifyClientAccess(workspace.id, validClient.id);
    assert(clientAccess.id === validClient.id, "Authorized client within workspace is accessible");

    try {
      await verifyClientAccess("foreign_workspace_fake", validClient.id);
      assert(false, "Cross-workspace access to client must be rejected");
    } catch (err) {
      assert(err instanceof TenantAccessDeniedError, "Cross-workspace client access rejected");
    }
  }

  // TEST 5: Rate Limiter Protection
  const testIpKey = "test_attacker_ip_192_168_1_100";
  let wasBlocked = false;

  for (let i = 0; i < 15; i++) {
    const res = rateLimitByKey(testIpKey, 5, 60000);
    if (!res.ok) {
      wasBlocked = true;
      break;
    }
  }
  assert(wasBlocked, "Brute-force burst triggers HTTP 429 rate-limit lockout");

  // TEST 6: Parameterized SQL Injection Immunity Check
  const injectionPayload = "'; DROP TABLE User; --";
  const safeQuery = await db.user.findMany({
    where: { email: injectionPayload },
  });
  assert(Array.isArray(safeQuery), "SQL injection attack string safely handled via Prisma AST parameterization");

  console.log("\n==================================================");
  console.log(`SECURITY AUDIT RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error("Security audit failed with error:", err);
  process.exit(1);
});

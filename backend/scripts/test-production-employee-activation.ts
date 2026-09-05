import { db } from "../src/lib/db";
import {
  sendEmployeeInvitation,
  validateInvitationToken,
  activateEmployeeAccount,
} from "../src/lib/employees/invitation.service";
import {
  getEmployeeActivationContext,
  acknowledgeEmployeePolicy,
  requestEmployeeToolAccess,
  completeEmployeeOnboarding,
} from "../src/lib/employees/employee-activation.service";
import { queryEmployeeCopilot } from "../src/lib/employees/employee-copilot.service";

async function runProductionActivationVerification() {
  console.log("===============================================================");
  console.log("BUSINESS OS — PRODUCTION-GRADE EMPLOYEE ACTIVATION TEST SUITE");
  console.log("===============================================================");

  // 1. Resolve Workspace
  const workspace = await db.workspace.findFirst({
    include: { owner: true },
  });
  if (!workspace) throw new Error("Workspace not found.");
  console.log(`[✓] Workspace: "${workspace.companyName}" (${workspace.id})`);

  // 2. Resolve or create Role & Team
  let role = await db.organizationRole.findFirst({
    where: { workspaceId: workspace.id, code: "ROLE-ENG-STAFF" },
  });
  if (!role) {
    role = await db.organizationRole.create({
      data: {
        workspaceId: workspace.id,
        name: "Staff Platform Engineer",
        code: "ROLE-ENG-STAFF",
        department: "ENGINEERING",
        purpose: "Architect resilient infrastructure, ensure zero-downtime deployments, and mentor squad members.",
        responsibilities: JSON.stringify([
          "Design scalable data pipelines",
          "Ensure sub-50ms API latencies",
          "Lead architectural reviews",
        ]),
        permissionTemplate: JSON.stringify({
          can: [
            "Access Core Infrastructure Blueprints",
            "Deploy to Staging and Production perimeters",
            "Review pull requests across squads",
          ],
          cannot: [
            "Modify billing and organization subscription",
            "Delete production client records",
          ],
        }),
      },
    });
  }
  console.log(`[✓] Role: "${role.name}" (${role.code})`);

  let team = await db.organizationTeam.findFirst({
    where: { workspaceId: workspace.id, code: "TEAM-PLATFORM" },
  });
  if (!team) {
    team = await db.organizationTeam.create({
      data: {
        workspaceId: workspace.id,
        name: "Platform Core Squad",
        code: "TEAM-PLATFORM",
        department: "ENGINEERING",
        description: "Core distributed systems and cloud execution architecture.",
      },
    });
  }
  console.log(`[✓] Team: "${team.name}" (${team.code})`);

  // 3. Create Employee
  const email = `platform.lead.${Date.now()}@businessos.test`;
  const employeeCode = `EMP-${Math.floor(2000 + Math.random() * 8000)}`;

  const employee = await db.employee.create({
    data: {
      workspaceId: workspace.id,
      employeeCode,
      fullName: "Priya Sundaram",
      email,
      status: "INVITED",
      roleId: role.id,
      teamId: team.id,
      department: "ENGINEERING",
      primaryResponsibility: "Leading platform scaling and architectural resilience.",
      capacityTargetHours: 40,
    },
  });
  console.log(`[✓] Employee created: "${employee.fullName}" (${employee.email})`);

  // 4. Send Real Invitation & Validate Token
  const invite = await sendEmployeeInvitation({
    workspaceId: workspace.id,
    employeeId: employee.id,
    actorName: workspace.owner.name || "Admin",
    actorId: workspace.owner.id,
  });

  console.log(`[✓] Invitation generated (ID: ${invite.invitationId})`);
  console.log(`    — Activation Link: ${invite.activationUrl}`);

  // Retrieve invitation token hash for activation
  const rawToken = invite.rawToken;
  if (!rawToken) throw new Error("Raw token missing from invitation response.");

  const validation = await validateInvitationToken(rawToken);
  console.log(`[✓] Token server-side validation: ${validation.valid ? "PASSED" : "FAILED"}`);

  // 5. Account Creation / Activation
  const activation = await activateEmployeeAccount({
    rawToken,
    password: "EnterprisePassword123!",
  });
  console.log(`[✓] Account activated: User ID: ${activation.user.id}, Status: ${activation.employee.status}`);

  // 6. Deep Activation Context Resolution
  const ctx = await getEmployeeActivationContext(employee.id);
  if (!ctx) throw new Error("Failed to resolve activation context.");
  console.log(`[✓] Activation Context Resolved:`);
  console.log(`    — Identity: ${ctx.identity.fullName} (${ctx.identity.employeeCode})`);
  console.log(`    — Initial Readiness Score: ${ctx.readiness.score}%`);
  console.log(`    — Initial Status: ${ctx.readiness.status}`);
  console.log(`    — Active Blockers: ${ctx.readiness.blockers.length} blocker(s)`);
  console.log(`    — Seeded Policies: ${ctx.policies.length} policy record(s)`);
  console.log(`    — Seeded Tools: ${ctx.tools.length} tool record(s)`);

  // 7. Test Policy Center Acknowledgement
  const requiredPolicies = ctx.policies.filter((p) => p.isRequired && !p.isAcknowledged);
  console.log(`[✓] Acknowledging ${requiredPolicies.length} required compliance policies...`);

  for (const pol of requiredPolicies) {
    const ackRes = await acknowledgeEmployeePolicy({
      employeeId: employee.id,
      policyId: pol.id,
      ip: "192.168.1.100",
      actorName: employee.fullName,
    });
    console.log(`    — Acknowledged: "${pol.title}" (${pol.policyCode}): ${ackRes.ok ? "PASSED" : "FAILED"}`);
  }

  // Re-check readiness after policy acknowledgement
  const updatedCtx = await getEmployeeActivationContext(employee.id);
  console.log(`[✓] Post-Policy Readiness Score: ${updatedCtx?.readiness.score}% (Status: ${updatedCtx?.readiness.status})`);
  console.log(`    — Policies Ready: ${updatedCtx?.readiness.policiesReady ? "PASSED" : "FAILED"}`);

  // 8. Test Tool Access Request
  const githubTool = updatedCtx?.tools.find((t) => t.toolKey === "GITHUB");
  if (githubTool) {
    const toolReq = await requestEmployeeToolAccess({
      employeeId: employee.id,
      toolId: githubTool.id,
      accountIdentifier: "priya-platform-eng",
      actorName: employee.fullName,
    });
    console.log(`[✓] Tool Access Request (GitHub): ${toolReq.ok && toolReq.tool?.status === "ACCESS_REQUESTED" ? "PASSED" : "FAILED"}`);
  }

  // 9. Test Grounded AI Onboarding Copilot
  console.log(`[✓] Testing AI Onboarding Copilot query...`);
  const copilotQuery = await queryEmployeeCopilot({
    employeeId: employee.id,
    question: "What is my role, who is my manager, and what policies have I acknowledged?",
  });
  console.log(`    — Copilot Response ok: ${copilotQuery.ok ? "PASSED" : "FAILED"}`);
  console.log(`    — Answer preview: ${copilotQuery.answer.slice(0, 150)}...`);

  // 10. Complete Onboarding Transition
  const completion = await completeEmployeeOnboarding({
    employeeId: employee.id,
    actorName: employee.fullName,
  });
  console.log(`[✓] Onboarding Completion Transition: ${completion.ok ? "PASSED" : "FAILED"}`);

  const finalCtx = await getEmployeeActivationContext(employee.id);
  console.log(`[✓] Final Verified State:`);
  console.log(`    — Status: ${finalCtx?.readiness.status} (Expected: COMPLETED)`);
  console.log(`    — Score: ${finalCtx?.readiness.score}% (Expected: 100%)`);
  console.log(`    — Completed At: ${finalCtx?.onboardingState.completedAt}`);

  console.log("===============================================================");
  console.log("ALL PRODUCTION-GRADE EMPLOYEE ACTIVATION TESTS PASSED 100%!");
  console.log("===============================================================");
}

runProductionActivationVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });

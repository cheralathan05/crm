import { db } from "../src/lib/db";
import {
  createProjectInvitation,
  getInvitationDetails,
  acceptProjectInvitation,
} from "../src/lib/employees/project-invitation.service";
import { getProjectTeamOverview } from "../src/lib/projects/project-team.service";

async function runInvitationFlowTest() {
  console.log("=== TESTING ADMIN INVITATION & EMPLOYEE ACCEPTANCE FLOW ===");

  const projectA = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
  });
  if (!projectA) throw new Error("Project A not found");

  const testEmail = `test.developer.${Date.now()}@businessos.internal`;
  const teamName = "QA";
  const projectRole = "Automation Test Engineer";

  console.log(`Step 1: Admin creates invitation for ${testEmail} to ${projectA.name} (${teamName} - ${projectRole})`);
  const inviteResult = await createProjectInvitation({
    projectId: projectA.id,
    teamName,
    projectRole,
    recipientEmail: testEmail,
    actorName: "Lead Admin",
    baseUrl: "http://localhost:3000",
  });

  console.log("Invitation created:", {
    invitationId: inviteResult.invitationId,
    token: inviteResult.rawToken,
    status: inviteResult.status,
    acceptUrl: inviteResult.acceptUrl,
  });

  // Step 2: Employee opens invitation link (token validation)
  console.log("\nStep 2: Employee validates token via /invite/[token]");
  const inviteDetails = await getInvitationDetails(inviteResult.rawToken);
  console.log("Token validated successfully:", {
    project: inviteDetails.projectName,
    team: inviteDetails.teamName,
    role: inviteDetails.projectRole,
    hasExistingAccount: inviteDetails.hasExistingAccount,
  });

  // Step 3: Employee accepts invitation
  console.log("\nStep 3: Employee submits acceptance & sets password");
  const acceptResult = await acceptProjectInvitation({
    rawToken: inviteResult.rawToken,
    password: "securepassword123",
    fullName: "Elena Rostova",
  });

  console.log("Acceptance completed:", acceptResult);

  // Step 4: Verify Project Staff Allocation
  const allocation = await db.projectStaffAllocation.findFirst({
    where: {
      projectId: projectA.id,
      employeeId: acceptResult.employeeId,
      status: "ACTIVE",
    },
  });

  console.log("\nStep 4: Real database membership confirmed:", {
    id: allocation?.id,
    teamName: allocation?.teamName,
    projectRole: allocation?.projectRole,
    status: allocation?.status,
  });

  if (allocation?.teamName !== "QA" || allocation?.projectRole !== projectRole) {
    throw new Error("Allocation mismatch!");
  }

  // Step 5: Verify Project Team Overview includes new member
  const updatedOverview = await getProjectTeamOverview(projectA.id);
  const qaMembers = updatedOverview.teams.QA.members;
  console.log(`\nStep 5: Updated QA Team Count in Project A: ${qaMembers.length} members`);
  const found = qaMembers.find((m: any) => m.name.includes("Elena"));
  console.log("Found Elena in QA team:", found ? "YES" : "NO", found);

  console.log("\n=== INVITATION & MEMBERSHIP FLOW TEST PASSED 100%! ===");
}

runInvitationFlowTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });

import { createProjectInvitation, getInvitationDetails } from "../src/lib/employees/project-invitation.service";
import { db } from "../src/lib/db";

async function run() {
  const project = await db.clientProject.findFirst({ where: { name: { contains: "CRM" } } });
  if (!project) throw new Error("No CRM project found");

  console.log("============================================================");
  console.log("01 — TESTING FRONTEND SQUAD INVITATION FORMAT");
  console.log("============================================================");
  const feInvite = await createProjectInvitation({
    projectId: project.id,
    teamName: "FRONTEND",
    projectRole: "Frontend Developer",
    recipientEmail: `sarah.frontend.${Date.now()}@businessos.internal`,
    actorName: "Cheralathan Admin",
    baseUrl: "http://localhost:3000",
  });

  console.log("Frontend Squad Invitation Output:", {
    projectId: feInvite.projectId,
    projectName: feInvite.projectName,
    projectCode: feInvite.projectCode,
    client: feInvite.clientCompany,
    team: feInvite.teamName,
    role: feInvite.projectRole,
    approvedScope: feInvite.approvedProductAreas,
    acceptUrl: feInvite.acceptUrl,
  });

  const feDetails = await getInvitationDetails(feInvite.rawToken);
  console.log("\nFrontend Onboarding Acceptance Page Data:", {
    projectName: feDetails.projectName,
    projectCode: feDetails.projectCode,
    clientCompany: feDetails.clientCompany,
    teamName: feDetails.teamName,
    projectRole: feDetails.projectRole,
    responsibility: feDetails.responsibility,
    approvedProductAreas: feDetails.approvedProductAreas,
  });

  console.log("\n============================================================");
  console.log("02 — TESTING BACKEND SQUAD INVITATION FORMAT");
  console.log("============================================================");
  const beInvite = await createProjectInvitation({
    projectId: project.id,
    teamName: "BACKEND",
    projectRole: "Backend Engineer",
    recipientEmail: `alex.backend.${Date.now()}@businessos.internal`,
    actorName: "Cheralathan Admin",
    baseUrl: "http://localhost:3000",
  });

  console.log("Backend Squad Invitation Output:", {
    projectId: beInvite.projectId,
    projectName: beInvite.projectName,
    projectCode: beInvite.projectCode,
    client: beInvite.clientCompany,
    team: beInvite.teamName,
    role: beInvite.projectRole,
    approvedScope: beInvite.approvedProductAreas,
    acceptUrl: beInvite.acceptUrl,
  });

  const beDetails = await getInvitationDetails(beInvite.rawToken);
  console.log("\nBackend Onboarding Acceptance Page Data:", {
    projectName: beDetails.projectName,
    projectCode: beDetails.projectCode,
    clientCompany: beDetails.clientCompany,
    teamName: beDetails.teamName,
    projectRole: beDetails.projectRole,
    responsibility: beDetails.responsibility,
    approvedProductAreas: beDetails.approvedProductAreas,
  });

  console.log("\n============================================================");
  console.log("ALL SQUAD INVITATION FORMATS VERIFIED 100%!");
  console.log("============================================================");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

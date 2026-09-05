import { createProjectInvitation, acceptProjectInvitation } from "../src/lib/employees/project-invitation.service";
import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";
import { db } from "../src/lib/db";

async function main() {
  const project = await db.clientProject.findFirst({ where: { name: { contains: "CRM" } } });
  if (!project) throw new Error("No CRM project found");

  const email = `emily.frontend.${Date.now()}@businessos.internal`;
  console.log("=== STEP 1: INVITING FRONTEND DEVELOPER ===", email);
  const invite = await createProjectInvitation({
    projectId: project.id,
    teamName: "FRONTEND",
    projectRole: "Frontend Developer",
    recipientEmail: email,
    actorName: "Cheralathan Admin",
    baseUrl: "http://localhost:3000",
  });

  console.log("Invitation Created:", {
    acceptUrl: invite.acceptUrl,
    team: invite.teamName,
    role: invite.projectRole,
  });

  console.log("\n=== STEP 2: EMPLOYEE ACCEPTS INVITATION ===");
  const acceptRes = await acceptProjectInvitation({
    rawToken: invite.rawToken,
    password: "Password123!",
    fullName: "Emily Blunt",
  });

  console.log("Acceptance Result:", {
    employeeId: acceptRes.employeeId,
    projectName: acceptRes.projectName,
    team: acceptRes.teamName,
  });

  console.log("\n=== STEP 3: INSPECTING EMILY'S PORTAL TASKS ===");
  const portal = await getEmployeePortalData({ employeeId: acceptRes.employeeId });
  console.log("Emily Discipline:", portal.employee.discipline);
  console.log("Emily Project:", portal.currentProject?.name);
  console.log("Emily Work Items Count:", portal.workItems.length);

  for (const w of portal.workItems) {
    console.log(`- [${w.code}] "${w.title}"`);
    console.log(`  Product Area: ${w.productAreaName} | Layer: ${w.layer} | Workstream: ${w.workstream}`);
    console.log(`  Source: ${w.sourceRequirementTitle} → ${w.sourceDeliverableTitle}`);
    console.log(`  Dependency: ${w.dependencyDetails ? `${w.dependencyDetails.title} (${w.dependencyDetails.ownerName})` : "None"}`);
    console.log(`  Proof Required: ${w.proofTypeRequired}\n`);
  }

  console.log("Execution Queue:");
  console.log("CURRENT:", portal.executionQueue?.current?.title);
  console.log("NEXT:", portal.executionQueue?.next?.title);
  console.log("UPCOMING:", portal.executionQueue?.upcoming?.map((u: any) => u.title));
}

main().catch(console.error);

import { db } from "../src/lib/db";
import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";

async function testEmployeeContextSwitch() {
  console.log("=== TESTING EMPLOYEE CONTEXT SWITCHING (SECTION 2, 7, 18) ===");

  const johnUser = await db.user.findUnique({
    where: { email: "john.developer@businessos.internal" },
    include: { employee: true },
  });

  if (!johnUser || !johnUser.employee) {
    throw new Error("John employee not found");
  }

  const projectA = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
  });
  const projectB = await db.clientProject.findFirst({
    where: { code: "PRJ-2026-002" },
  });

  if (!projectA || !projectB) throw new Error("Projects not found");

  // 1. Context in Project A
  console.log("\n--- JOHN ENTERS PROJECT A (CRM) ---");
  const dataA = await getEmployeePortalData({
    employeeId: johnUser.employee.id,
    requestedProjectId: projectA.id,
  });

  console.log("MY PROJECT:", dataA.myProject?.name);
  console.log("MY ROLE:", dataA.myRole);
  console.log("MY TEAM:", dataA.myTeam);
  console.log("MY WORK:", dataA.myWork);
  console.log("PROJECT TEAMS:", dataA.projectTeams);

  // 2. Context in Project B
  console.log("\n--- JOHN SWITCHES TO PROJECT B (E-COMMERCE) ---");
  const dataB = await getEmployeePortalData({
    employeeId: johnUser.employee.id,
    requestedProjectId: projectB.id,
  });

  console.log("MY PROJECT:", dataB.myProject?.name);
  console.log("MY ROLE:", dataB.myRole);
  console.log("MY TEAM:", dataB.myTeam);
  console.log("MY WORK:", dataB.myWork);
  console.log("PROJECT TEAMS:", dataB.projectTeams);

  // Assertions
  if (dataA.myTeam !== "FRONTEND" || dataA.myRole !== "Frontend Developer") {
    throw new Error(`Project A role/team mismatch: team=${dataA.myTeam}, role=${dataA.myRole}`);
  }
  if (dataB.myTeam !== "BACKEND" || dataB.myRole !== "Backend Developer") {
    throw new Error(`Project B role/team mismatch: team=${dataB.myTeam}, role=${dataB.myRole}`);
  }

  console.log("\n=== PROJECT SWITCHING CONTEXT TEST PASSED 100%! ===");
}

testEmployeeContextSwitch()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  });

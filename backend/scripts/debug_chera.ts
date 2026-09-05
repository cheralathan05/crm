import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";
import { db } from "../src/lib/db";

async function main() {
  const chera = await db.employee.findFirst({
    where: { fullName: { contains: "Chera" } },
  });
  if (!chera) throw new Error("Chera not found");

  console.log("Chera Employee ID:", chera.id, chera.email);
  const portal = await getEmployeePortalData({ employeeId: chera.id });

  console.log("Portal Current Project:", portal.currentProject?.name);
  console.log("Portal Discipline:", portal.employee?.discipline);
  console.log("Work Items count:", portal.workItems.length);
  for (const w of portal.workItems) {
    console.log(`- [${w.code}] "${w.title}" | Area: ${w.productAreaName} | Layer: ${w.layer} | Status: ${w.status}`);
  }
}

main().catch(console.error);

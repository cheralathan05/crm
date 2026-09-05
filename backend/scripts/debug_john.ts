import { db } from "../src/lib/db";
import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";

async function debug() {
  const john = await db.employee.findFirst({
    where: { email: "john.developer@businessos.internal" },
  });
  console.log("John Employee:", { id: john?.id, name: john?.fullName, email: john?.email });

  const data = await getEmployeePortalData({ employeeId: john!.id });
  console.log("Discipline:", data.employee.discipline);
  console.log("Current Project:", data.currentProject?.name);
  console.log("Work Items count:", data.workItems.length);
  console.log("\nWork Items:");
  data.workItems.forEach((w: any) => {
    console.log(`- [${w.code}] "${w.title}"`);
    console.log(`  Area: ${w.productAreaName} | Layer: ${w.layer} | Workstream: ${w.workstream} | Status: ${w.status}`);
    console.log(`  Dependency: ${w.dependencyDetails ? `${w.dependencyDetails.title} (${w.dependencyDetails.ownerName})` : "None"}`);
  });

  console.log("\nExecution Queue:");
  console.log("CURRENT:", data.executionQueue?.current?.title);
  console.log("NEXT:", data.executionQueue?.next?.title);
  console.log("UPCOMING:", data.executionQueue?.upcoming?.map((u: any) => u.title));
}

debug().then(() => process.exit(0));

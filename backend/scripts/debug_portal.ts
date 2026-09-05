import { db } from "../src/lib/db";
import { getEmployeePortalData } from "../src/lib/employees/employee-work-portal.service";

async function debug() {
  const john = await db.employee.findFirst({
    where: { email: "john.developer@businessos.internal" },
  });

  const projectA = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
  });

  const res = await getEmployeePortalData({
    employeeId: john!.id,
    requestedProjectId: projectA!.id,
  });

  console.log("Current Project:", res.currentProject?.name, "(ID:", res.currentProject?.id, ")");
  console.log("All Projects count:", res.allProjects.length);
  console.log("Work Items count:", res.workItems.length);
  console.log("Work Items titles:", res.workItems.map((w: any) => ({ code: w.code, title: w.title, assigneeName: w.assigneeName, status: w.status })));
  console.log("myWork summary:", res.myWork);
}

debug().then(() => process.exit(0)).catch(e => console.error(e));

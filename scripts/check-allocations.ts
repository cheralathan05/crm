import { db } from "../src/lib/db";

async function checkAllocations() {
  const allocations = await db.projectStaffAllocation.findMany({
    include: { employee: true, project: true }
  });
  console.log("Current Allocations Count:", allocations.length);
  allocations.forEach(a => {
    console.log(`- Employee: ${a.employee.fullName} (${a.employee.email}), Project: ${a.project.name}, Team: ${a.teamName}, Role: ${a.projectRole}, Status: ${a.status}`);
  });
}

checkAllocations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

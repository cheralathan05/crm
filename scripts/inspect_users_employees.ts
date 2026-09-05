import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log("Users in DB:", users);

  const employees = await db.employee.findMany({
    select: { id: true, fullName: true, email: true, userId: true, department: true },
  });
  console.log("Employees in DB:", employees);

  const allocations = await db.projectStaffAllocation.findMany({
    include: {
      employee: { select: { fullName: true, email: true } },
      project: { select: { name: true } },
    },
  });
  console.log("Allocations:", allocations.map(a => ({
    employee: a.employee.fullName,
    email: a.employee.email,
    project: a.project.name,
    team: a.teamName,
    role: a.projectRole,
  })));
}
main().catch(console.error);

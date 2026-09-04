import { db } from "../src/lib/db";

async function debug() {
  const john = await db.employee.findFirst({
    where: { email: "john.developer@businessos.internal" },
  });
  console.log("John Employee:", { id: john?.id, name: john?.fullName, email: john?.email });

  const tasksInA = await db.clientTask.findMany({
    where: {
      OR: [
        { assigneeId: john?.id },
        { assigneeName: john?.fullName },
      ],
    },
    select: { id: true, code: true, title: true, status: true, projectId: true, assigneeId: true, assigneeName: true },
  });
  console.log(`Found ${tasksInA.length} tasks for John:`, tasksInA);
}

debug().then(() => process.exit(0));

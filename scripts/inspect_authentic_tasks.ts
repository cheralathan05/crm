import { db } from "../src/lib/db";

async function main() {
  const authenticTasks = await db.clientTask.findMany({
    where: {
      projectId: "cmt3awnmk007ln4wagpt547wy",
      productAreaId: { not: null },
    },
    include: {
      productArea: true,
      responsibility: true,
    },
  });

  console.log("Authentic Product Tasks Count:", authenticTasks.length);
  for (const t of authenticTasks) {
    console.log(`[${t.code}] ${t.title} | Area: ${t.productArea?.name} (${t.phase}) | WS: ${t.workstream} | Layer: ${t.layer} | Assignee: ${t.assigneeName} (${t.assigneeId})`);
  }
}
main().catch(console.error);

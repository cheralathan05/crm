import { db } from "../src/lib/db";

async function main() {
  const tasks = await db.clientTask.findMany({
    where: {
      projectId: "cmt3awnmk007ln4wagpt547wy",
      code: { in: Array.from({ length: 25 }, (_, i) => `TSK-${String(i + 1).padStart(3, "0")}`) },
    },
    select: {
      id: true,
      code: true,
      title: true,
      workstream: true,
      layer: true,
      assigneeName: true,
      productAreaId: true,
      responsibilityId: true,
      isInvalidWork: true,
      invalidReason: true,
    },
  });

  console.log("Legacy tasks count:", tasks.length);
  for (const t of tasks) {
    console.log(`[${t.code}] ${t.title} | Area:${t.productAreaId} | Resp:${t.responsibilityId} | Invalid:${t.isInvalidWork}`);
  }
}
main().catch(console.error);

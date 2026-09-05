import { db } from "../src/lib/db";

async function main() {
  const project = await db.clientProject.findFirst({
    where: { name: { contains: "CRM" } },
    include: {
      tasks: {
        select: {
          id: true,
          code: true,
          title: true,
          workstream: true,
          layer: true,
          assigneeId: true,
          assigneeName: true,
          isInvalidWork: true,
          invalidReason: true,
          status: true,
          phase: true,
          productAreaId: true,
          responsibilityId: true,
        },
      },
    },
  });

  console.log("Project:", project?.name, "Total Tasks:", project?.tasks.length);
  for (const t of project?.tasks || []) {
    console.log(
      `[${t.code}] ${t.title} | WS:${t.workstream} | Layer:${t.layer} | Assignee:${t.assigneeName} | Invalid:${t.isInvalidWork} (${t.invalidReason}) | Status:${t.status} | Phase:${t.phase}`
    );
  }
}
main().catch(console.error);

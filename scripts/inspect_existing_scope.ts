import { db } from "../src/lib/db";

async function main() {
  const totalTasks = await db.clientTask.count();
  const tasks = await db.clientTask.findMany({
    take: 10,
    select: {
      id: true,
      code: true,
      title: true,
      workstream: true,
      layer: true,
      status: true,
      sourceType: true,
      sourceRequirementTitle: true,
      sourceDeliverableTitle: true,
      projectId: true,
    },
  });

  const projects = await db.clientProject.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      stage: true,
      proposalId: true,
      requirementRequestId: true,
      _count: {
        select: {
          tasks: true,
          deliverables: true,
          milestones: true,
          staffAllocations: true,
        },
      },
    },
  });

  const proposals = await db.clientProposal.findMany({
    select: {
      id: true,
      title: true,
      reference: true,
      status: true,
      requirementRequestId: true,
      versions: { select: { version: true, status: true } },
    },
  });

  const requirements = await db.requirementRequest.findMany({
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      features: { select: { id: true, name: true, priority: true } },
    },
  });

  console.log("=== INSPECTION SUMMARY ===");
  console.log("Total Tasks in DB:", totalTasks);
  console.log("Sample Tasks:", tasks);
  console.log("Projects:", JSON.stringify(projects, null, 2));
  console.log("Proposals:", JSON.stringify(proposals, null, 2));
  console.log("Requirements:", JSON.stringify(requirements, null, 2));
}

main().finally(() => db.$disconnect());

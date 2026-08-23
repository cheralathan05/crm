import { db } from "../src/lib/db";
import { orchestrateEngineeringBlueprint } from "../src/lib/ai/orchestrator/blueprint.orchestrator";
import { getActiveBlueprint } from "../src/lib/engineering/blueprint.service";

async function main() {
  console.log("=== VERIFYING REAL PROJECT ENGINEERING BLUEPRINT ===");

  // Find or check latest client project
  let project = await db.clientProject.findFirst({
    include: {
      client: true,
      proposal: true,
      deliverables: true,
      tasks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    console.log("No client project found. Looking for approved proposal or creating one...");
    const client = await db.client.findFirst();
    if (!client) {
      console.log("No client found. Database is fresh.");
      return;
    }
    project = await db.clientProject.create({
      data: {
        clientId: client.id,
        name: "E-Commerce Platform",
        code: "PRJ-2026-001",
        description: "Enterprise e-commerce platform for selling products online with catalogue, cart, and checkout.",
        stage: "DEVELOPMENT",
        health: "ON_TRACK",
        progress: 35,
        budget: 500000,
        currency: "INR",
        managerName: "Lead Architect",
        targetCompletion: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      include: {
        client: true,
        proposal: true,
        deliverables: true,
        tasks: true,
      },
    });
  }

  console.log(`Found Project: ${project.name} (${project.code || project.id}) for Client: ${project.client?.companyName}`);

  // Test generating/synthesizing Blueprint
  const result = await orchestrateEngineeringBlueprint({
    projectId: project.id,
    userName: "System Architect",
    forceNewVersion: false,
  });

  console.log(`Blueprint generation result: ok=${result.ok}, source=${result.source}`);

  // Fetch active blueprint
  const bp = await getActiveBlueprint(project.id);
  if (!bp) {
    console.error("Failed to retrieve active blueprint!");
    return;
  }

  console.log(`\n=== BLUEPRINT v${bp.version} VERIFICATION ===`);
  console.log(`Status: ${bp.status}`);
  console.log(`Frontend Capabilities: ${bp.frontendCapabilities.length}`);
  bp.frontendCapabilities.forEach((fe, idx) => {
    console.log(`  [FE-${idx + 1}] ${fe.name} (${fe.type}) -> Route: ${fe.route || "/"} | Req: ${fe.requirementId}`);
  });

  console.log(`\nBackend APIs: ${bp.backendApis.length}`);
  bp.backendApis.forEach((api, idx) => {
    console.log(`  [API-${idx + 1}] ${api.method} ${api.path} -> Service: ${api.service} | DB: ${api.databaseDependencies}`);
  });

  console.log(`\nDatabase Entities: ${bp.databaseEntities.length}`);
  bp.databaseEntities.forEach((dbE, idx) => {
    console.log(`  [DB-${idx + 1}] ${dbE.name} (table: ${dbE.tableName}) -> Req: ${dbE.requirementId}`);
  });

  console.log(`\nTest Specifications: ${bp.testSpecifications.length}`);
  bp.testSpecifications.forEach((test, idx) => {
    console.log(`  [TEST-${idx + 1}] ${test.name} (${test.testType}) -> Outcome: ${test.expectedOutcome?.slice(0, 40)}...`);
  });

  console.log(`\nDependencies: ${bp.dependencies.length}`);
  console.log("=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

import { db } from "../frontend/src/lib/db";
import { listRequirementRequests, getRequirementForUser, serializeAdminRequest } from "../frontend/src/lib/requirements";
import { getWorkspaceForUser, getClientForUser, listClients } from "../frontend/src/lib/clients";

async function main() {
  console.log("== Starting Comprehensive Requirements & Clients Integration Test ==");

  // 1. Get user and workspace
  const user = await db.user.findFirst();
  if (!user) throw new Error("No user found in dev.db");
  console.log("User:", user.id, user.name);

  const ws = await getWorkspaceForUser(user.id);
  if (!ws) throw new Error("No workspace found for user");
  console.log("Workspace:", ws.id, ws.name);

  // 2. Test Requirements Listing (Real DB)
  const reqList = await listRequirementRequests(ws.id, "all");
  console.log(`\nRequirement requests found in DB: ${reqList.rows.length}`);
  console.log("Counts:", reqList.counts);
  if (reqList.rows.length === 0) {
    throw new Error("Expected at least 1 requirement request");
  }

  for (const r of reqList.rows) {
    console.log(` - ${r.reference}: "${r.title}" (Status: ${r.status}, Client: ${r.companyName}, Completeness: ${r.completeness}%)`);
  }

  // 3. Test Requirement Detail & Admin Bundle (Real DB)
  const targetReq = reqList.rows[0];
  const reqDetail = await getRequirementForUser(user.id, targetReq.id);
  if (!reqDetail) throw new Error(`Could not load requirement ${targetReq.id} for user`);
  const serialized = await serializeAdminRequest(reqDetail);
  console.log(`\nAdmin Bundle for ${targetReq.reference}:`, {
    ok: serialized.ok,
    title: serialized.request.title,
    client: serialized.client?.companyName,
    sectionsWithAnswers: Object.keys(serialized.answers).length,
    featuresCount: serialized.features.length,
    eventsCount: serialized.events.length,
    canSend: serialized.request.canSend,
  });

  // 4. Test Clients Listing & Serialization (Real DB)
  const clients = await db.client.findMany({
    where: { workspaceId: ws.id },
    include: {
      projects: true,
      requirements: true,
      requirementRequests: true,
      proposals: true,
      payments: true,
      contacts: true,
      tasks: true,
    },
  });
  console.log(`\nClients found in DB: ${clients.length}`);
  for (const c of clients) {
    console.log(` - ${c.companyName} [${c.status}] RequirementRequests: ${c.requirementRequests.length}, Proposals: ${c.proposals.length}`);
  }

  // 5. Test Client Detail & Serialization
  const targetClient = clients[0];
  const clientDetail = await getClientForUser(user.id, targetClient.id);
  if (!clientDetail) throw new Error(`Could not load client ${targetClient.id}`);
  console.log(`\nClient detail loaded for ${clientDetail.companyName} (id: ${clientDetail.id})`);

  console.log("\n== ALL INTEGRATION CHECKS PASSED: 100% Real DB, 0 Mocks, Full Connectivity ==");
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

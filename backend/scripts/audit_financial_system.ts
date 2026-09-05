import { db } from "../src/lib/db";

async function audit() {
  console.log("=== BUSINESS OS FINANCIAL AUDIT ===");
  const clients = await db.client.findMany({ select: { id: true, companyName: true, email: true } });
  console.log(`\nClients (${clients.length}):`, clients);

  const proposals = await db.clientProposal.findMany({
    select: { id: true, reference: true, title: true, amount: true, currency: true, status: true, clientId: true },
  });
  console.log(`\nProposals (${proposals.length}):`, proposals);

  const projects = await db.clientProject.findMany({
    select: { id: true, name: true, code: true, budget: true, currency: true, clientId: true, proposalId: true },
  });
  console.log(`\nProjects (${projects.length}):`, projects);

  const milestones = await db.projectMilestone.findMany();
  console.log(`\nProject Milestones (${milestones.length}):`, milestones);

  const clientPayments = await db.clientPayment.findMany();
  console.log(`\nClient Payments in DB (${clientPayments.length}):`, clientPayments);
}

audit().catch(console.error);

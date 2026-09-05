import { db } from "../src/lib/db";

async function main() {
  const clients = await db.client.findMany();
  console.log("CLIENTS:", clients.length, clients.map(c => ({ id: c.id, name: c.companyName })));

  const proposals = await db.clientProposal.findMany({
    include: {
      client: true,
      versions: true,
      projects: true,
    }
  });
  console.log("PROPOSALS:", proposals.length, proposals.map(p => ({
    id: p.id,
    ref: p.reference,
    title: p.title,
    status: p.status,
    client: p.client?.companyName,
    versions: p.versions.length,
    projects: p.projects.map(pr => pr.name),
  })));

  const projects = await db.clientProject.findMany({
    include: {
      client: true,
      tasks: { select: { id: true, title: true } },
    }
  });
  console.log("PROJECTS:", projects.length, projects.map(pr => ({
    id: pr.id,
    code: pr.code,
    name: pr.name,
    client: pr.client?.companyName,
    tasksCount: pr.tasks.length,
  })));

  const bDocs = await db.businessDocument.findMany();
  console.log("BUSINESS DOCUMENTS:", bDocs.length, bDocs);
}

main().catch(console.error);

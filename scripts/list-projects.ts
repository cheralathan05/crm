import { db } from "../src/lib/db";

async function listProjects() {
  const projects = await db.clientProject.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log("Projects:", projects);
}

listProjects().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("============================================================");
  console.log("BUSINESS OS — REAL DOCUMENT ASSET & RECORD AUDIT");
  console.log("============================================================");

  // 1. Proposals
  const proposals = await db.clientProposal.findMany({
    include: {
      client: { select: { id: true, companyName: true } },
      versions: { orderBy: { version: "desc" } },
      deliveries: true,
      approvals: true,
      projects: { select: { id: true, name: true, code: true } },
    },
  });
  console.log(`\n1. PROPOSALS IN DB: ${proposals.length}`);
  proposals.forEach((p) => {
    console.log(`- [${p.reference}] "${p.title}" | Status: ${p.status} | Version: v${p.version} | Client: ${p.client?.companyName}`);
    console.log(`  Projects: ${p.projects.map((proj) => `${proj.name} (${proj.code})`).join(", ") || "None"}`);
    console.log(`  Versions in DB (${p.versions.length}):`);
    p.versions.forEach((v) => {
      console.log(`    * v${v.version} | Status: ${v.status} | Created: ${v.createdAt.toISOString()} | Title: ${v.title || "N/A"}`);
    });
    console.log(`  Deliveries: ${p.deliveries.length} | Approvals: ${p.approvals.length}`);
  });

  // 2. Client Documents in DB
  const clientDocs = await db.clientDocument.findMany({
    include: { client: { select: { companyName: true } } },
  });
  console.log(`\n2. CLIENT DOCUMENTS IN DB: ${clientDocs.length}`);
  clientDocs.forEach((d) => {
    console.log(`- [${d.id}] "${d.name}" | Category: ${d.category} | URL: ${d.url} | Client: ${d.client?.companyName}`);
  });

  // 3. Requirement Attachments in DB
  const reqAttachments = await db.requirementAttachment.findMany();
  console.log(`\n3. REQUIREMENT ATTACHMENTS IN DB: ${reqAttachments.length}`);
  reqAttachments.forEach((a) => {
    console.log(`- [${a.id}] "${a.name}" | Path: ${a.path} | Size: ${a.size}`);
  });

  // 4. Task Attachments in DB
  const taskAttachments = await db.taskAttachment.findMany();
  console.log(`\n4. TASK ATTACHMENTS IN DB: ${taskAttachments.length}`);
  taskAttachments.forEach((a) => {
    console.log(`- [${a.id}] "${a.name}" | URL: ${a.url}`);
  });

  // 5. Filesystem scan for generated PDFs, documents, or uploads
  console.log("\n5. FILESYSTEM SCAN FOR STORED DOCUMENTS / PDFs:");
  const scanDirs = [
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "storage"),
    path.join(process.cwd(), "documents"),
    path.join(process.cwd(), "pdf"),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "public", "proposals"),
    path.join(process.cwd(), "public", "documents"),
  ];

  for (const dir of scanDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`- Dir exists: ${dir} (${files.length} items)`);
      files.forEach((f) => {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory()) {
          console.log(`   * ${f} (${stat.size} bytes, modified: ${stat.mtime.toISOString()})`);
        } else {
          console.log(`   * [DIR] ${f}`);
        }
      });
    } else {
      console.log(`- Dir does not exist: ${dir}`);
    }
  }

  // 6. Search for any *.pdf files across entire project root (excluding node_modules and .git)
  console.log("\n6. SEARCH FOR ANY *.pdf or *.docx FILES IN REPO:");
  function findPdfs(dir: string, depth = 0): string[] {
    if (depth > 4) return [];
    let results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === ".next" || e.name === ".gemini") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          results = results.concat(findPdfs(full, depth + 1));
        } else if (e.name.toLowerCase().endsWith(".pdf") || e.name.toLowerCase().endsWith(".docx")) {
          results.push(full);
        }
      }
    } catch {}
    return results;
  }

  const foundPdfs = findPdfs(process.cwd());
  console.log(`Found ${foundPdfs.length} PDF / DOCX files in repo:`);
  foundPdfs.forEach((p) => console.log(`  -> ${p}`));

  console.log("\n============================================================");
  console.log("AUDIT COMPLETE.");
  console.log("============================================================");
}

main().catch(console.error);

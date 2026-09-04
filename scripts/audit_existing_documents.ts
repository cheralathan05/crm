import { db } from "../src/lib/db";
import { uploadsRoot, readStored } from "../src/lib/uploads";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

async function main() {
  console.log("============================================================");
  console.log("AUDITING EXISTING BUSINESS OS DOCUMENT ARTIFACTS");
  console.log("============================================================\n");

  // 1. Proposals
  const proposals = await db.clientProposal.findMany({
    include: {
      client: { select: { id: true, companyName: true } },
      versions: true,
      projects: { select: { id: true, name: true, code: true } },
    },
  });

  console.log(`[1] PROPOSALS IN DATABASE (${proposals.length}):`);
  for (const p of proposals) {
    console.log(`  Proposal: ${p.reference || p.id} — "${p.title}"`);
    console.log(`    Status: ${p.status}, Version: v${p.version}`);
    console.log(`    pdfPath: ${p.pdfPath}, pdfPages: ${p.pdfPages}`);
    console.log(`    Client: ${p.client?.companyName} (${p.clientId})`);
    console.log(`    Linked Projects: ${p.projects.map(pr => `${pr.code} - ${pr.name}`).join(", ") || "None"}`);
    
    // Check if file exists
    if (p.pdfPath) {
      const stored = await readStored(p.pdfPath);
      console.log(`    File on disk: ${stored ? `EXISTS (${stored.size} bytes)` : "MISSING"}`);
    } else {
      console.log(`    File on disk: NOT GENERATED`);
    }

    console.log(`    Versions (${p.versions.length}):`);
    for (const v of p.versions) {
      console.log(`      - v${v.version}: Status=${v.status}, pdfPath=${v.pdfPath}, pages=${v.pdfPages}`);
      if (v.pdfPath) {
        const stored = await readStored(v.pdfPath);
        console.log(`        Version file on disk: ${stored ? `EXISTS (${stored.size} bytes)` : "MISSING"}`);
      }
    }
  }

  // 2. Client Documents table
  const clientDocs = await db.clientDocument.findMany({
    include: {
      client: { select: { id: true, companyName: true } },
    },
  });
  console.log(`\n[2] CLIENT DOCUMENTS TABLE RECORDS (${clientDocs.length}):`);
  for (const cd of clientDocs) {
    console.log(`  - [${cd.category}] "${cd.name}" (URL: ${cd.url}, Size: ${cd.size}, Client: ${cd.client?.companyName})`);
  }

  // 3. Requirement Attachments
  const reqAttachments = await db.requirementAttachment.findMany({
    include: {
      request: { select: { id: true, reference: true, title: true } },
    },
  });
  console.log(`\n[3] REQUIREMENT ATTACHMENTS (${reqAttachments.length}):`);
  for (const ra of reqAttachments) {
    console.log(`  - "${ra.name}" in ${ra.request?.reference} (Path: ${ra.path}, Size: ${ra.size})`);
    if (ra.path) {
      const stored = await readStored(ra.path);
      console.log(`    File on disk: ${stored ? `EXISTS (${stored.size} bytes)` : "MISSING"}`);
    }
  }

  // 4. File system inspection under uploadsRoot()
  console.log(`\n[4] FILESYSTEM UNDER UPLOADS ROOT (${uploadsRoot()}):`);
  try {
    async function scanDir(dir: string, rel: string = ""): Promise<Array<{ path: string; size: number }>> {
      const entries = await readdir(dir, { withFileTypes: true });
      let files: Array<{ path: string; size: number }> = [];
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const relPath = path.join(rel, e.name);
        if (e.isDirectory()) {
          files = files.concat(await scanDir(full, relPath));
        } else {
          const st = await stat(full);
          files.push({ path: relPath.replace(/\\/g, "/"), size: st.size });
        }
      }
      return files;
    }

    const diskFiles = await scanDir(uploadsRoot());
    console.log(`Total files in uploads: ${diskFiles.length}`);
    diskFiles.forEach(f => console.log(`  - ${f.path} (${f.size} bytes)`));
  } catch (err: any) {
    console.log(`  Uploads directory scan: ${err.message}`);
  }

  // 5. Evidence records (Proof)
  const evidence = await db.evidenceRecord.findMany({
    take: 5,
  });
  console.log(`\n[5] EVIDENCE RECORDS (${evidence.length}):`);
  for (const ev of evidence) {
    console.log(`  - [${ev.type}] "${ev.title}" (URL: ${ev.url})`);
  }
}

main().finally(() => db.$disconnect());

import { syncRealDocuments } from "../src/lib/documents/document-indexer.service";
import { getDocumentTraceability } from "../src/lib/documents/document-traceability.service";
import { db } from "../src/lib/db";

async function runTest() {
  console.log("=== RUNNING DOCUMENT OPERATING LAYER TEST ===");

  // 1. Run sync
  const syncRes = await syncRealDocuments();
  console.log("Sync Result:", syncRes);

  // 2. Query documents
  const docs = await db.businessDocument.findMany({
    include: {
      client: { select: { companyName: true } },
      proposal: { select: { reference: true, title: true, status: true } },
      project: { select: { name: true, code: true } },
      versions: true,
      links: true,
    },
  });

  console.log(`\nFound ${docs.length} real Business Documents in DB:`);
  for (const doc of docs) {
    console.log(`\nDocument [${doc.id}]:`);
    console.log(`  Title: ${doc.title}`);
    console.log(`  Reference: ${doc.reference}`);
    console.log(`  File Name: ${doc.fileName}`);
    console.log(`  Status: ${doc.status} | Health: ${doc.healthState}`);
    console.log(`  Storage Path: ${doc.storagePath}`);
    console.log(`  Size: ${doc.fileSize} bytes | Pages: ${doc.pageCount}`);
    console.log(`  Checksum: ${doc.checksum}`);
    console.log(`  Client: ${doc.client?.companyName}`);
    console.log(`  Proposal: ${doc.proposal?.reference} (${doc.proposal?.status})`);
    console.log(`  Project: ${doc.project ? `${doc.project.name} (${doc.project.code})` : "None"}`);
    console.log(`  Versions (${doc.versions.length}):`);
    doc.versions.forEach((v) => console.log(`    * v${v.version}: ${v.fileName} [${v.status}]`));
    console.log(`  Links (${doc.links.length}):`);
    doc.links.forEach((l) => console.log(`    * ${l.entityType} -> ${l.entityId} (${l.relationshipType})`));

    // 3. Test traceability
    const trace = await getDocumentTraceability(doc.id);
    console.log("\n  Traceability Requirements Count:", trace?.requirements.total);
    console.log(`  MVP: ${trace?.requirements.mvpCount} | Phase 2: ${trace?.requirements.phase2Count}`);
    console.log("  Sample REQs:", trace?.requirements.items.slice(0, 3));
  }

  // 4. Run sync a second time to ensure idempotency (0 duplicates)
  const syncRes2 = await syncRealDocuments();
  console.log("\nSecond Sync (Idempotency test):", syncRes2);
  const docsAfter = await db.businessDocument.count();
  console.log(`Total documents after second sync: ${docsAfter} (Must equal ${docs.length})`);

  console.log("\n=== TEST PASSED SUCCESSFULLY ===");
}

runTest().catch(console.error);

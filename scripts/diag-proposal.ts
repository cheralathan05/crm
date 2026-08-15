import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { serializeAdminRequest } from "../src/lib/requirements";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }) });

async function main() {
  const req = await db.requirementRequest.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!req) return console.log("no requirements");
  const bundle = await serializeAdminRequest(req);
  console.log("status:", req.status, "| stored readiness:", req.readiness, "| completeness:", req.completeness);
  console.log("states:", JSON.stringify(bundle.states));
  console.log("intel.nextAction:", JSON.stringify(bundle.intel.nextAction));
  console.log("intel.blockers:", JSON.stringify(bundle.intel.blockers.map((b) => b.label)));
  console.log("intel.readiness rows:");
  for (const row of bundle.intel.readiness.rows) console.log(`  ${row.ok ? "✓" : "✗"} ${row.label} — ${row.note}`);
  console.log("questions:", JSON.stringify(bundle.questions.map((q) => ({ section: q.section, status: q.status, blocking: q.isBlocking }))));
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

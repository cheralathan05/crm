/**
 * Regression checks for the code-review fixes:
 *   1. Removing a feature no longer double-deletes (P2025 crash).
 *   2. Proposal budget uses the UPPER bound of the range.
 *   3. Revoke records a REQUEST_REVOKED event (not APPROVED).
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { saveFeatures, transitionRequest, createProposalFromRequirement } from "../src/lib/requirements";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const req = await db.requirementRequest.findFirst({
    where: { title: "E-Commerce Platform" },
  });
  if (!req) {
    console.log("no request found");
    return;
  }

  // 1. Remove a feature — previously crashed with P2025.
  const before = await db.requirementFeature.count({ where: { requestId: req.id } });
  await saveFeatures(req, [
    { name: "Payments", priority: "MUST_HAVE", users: [], description: "p", config: {}, acceptanceCriteria: [], dependencies: [] },
  ]);
  const after = await db.requirementFeature.count({ where: { requestId: req.id } });
  check("feature removal succeeds", after === 1, `${before} → ${after}`);
  const remaining = await db.requirementFeature.findMany({ where: { requestId: req.id } });
  check("only Payments remains", remaining.length === 1 && remaining[0].name === "Payments", remaining.map((f) => f.name).join(","));

  // Re-add the other features for realism.
  await saveFeatures(req, [
    { name: "Payments", priority: "MUST_HAVE", users: [], description: "p", config: {}, acceptanceCriteria: [], dependencies: [] },
    { name: "Orders & checkout", priority: "SHOULD_HAVE", users: [], description: "o", config: {}, acceptanceCriteria: [], dependencies: [] },
    { name: "Email & SMS notifications", priority: "SHOULD_HAVE", users: [], description: "n", config: {}, acceptanceCriteria: [], dependencies: [] },
  ]);
  check("features restored", (await db.requirementFeature.count({ where: { requestId: req.id } })) === 3);

  // 2. Budget upper bound.
  const req2 = { ...req, clientId: req.clientId };
  // Patch the commercial answer to a range with an upper bound.
  await db.requirementAnswer.upsert({
    where: { requestId_section: { requestId: req.id, section: "commercial" } },
    create: { requestId: req.id, section: "commercial", data: JSON.stringify({ budgetModel: "Fixed price", budgetRange: "₹1L – ₹3L" }) },
    update: { data: JSON.stringify({ budgetModel: "Fixed price", budgetRange: "₹1L – ₹3L" }) },
  });
  const p1 = await createProposalFromRequirement({ request: req2, actorName: "Sidebar Test" });
  check("budget uses upper bound (₹1L–₹3L → 3L)", p1.amount === 300_000, `amount=${p1.amount}`);
  await db.clientProposal.delete({ where: { id: p1.id } });
  await db.clientNote.deleteMany({ where: { clientId: req.clientId, content: { contains: "created from requirement" } } });

  // 3. Revoke event type.
  await transitionRequest({
    request: req,
    action: "revoke",
    actorName: "Sidebar Test",
    actorId: "e2e-fixes",
    data: { reason: "Fix check" },
  });
  const ev = await db.requirementEvent.findFirst({
    where: { requestId: req.id, label: "Access revoked" },
    orderBy: { createdAt: "desc" },
  });
  check("revoke event type is REQUEST_REVOKED", ev?.type === "REQUEST_REVOKED", ev?.type ?? "none");

  // Restore the request to a usable state.
  await db.requirementRequest.update({
    where: { id: req.id },
    data: { status: "SUBMITTED", tokenRevokedAt: null, tokenRevokedReason: null },
  });
  check("request restored to SUBMITTED", (await db.requirementRequest.findUnique({ where: { id: req.id } }))?.status === "SUBMITTED");

  console.log(failures === 0 ? "\nALL FIX CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

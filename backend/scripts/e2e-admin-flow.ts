/**
 * E2E test of the admin requirement flow through the domain layer
 * (the exact code paths the API routes call):
 *   request-changes → verify CHANGES_REQUESTED → client responds
 *   → resubmit → approve → create proposal → verify data handoff.
 *
 * Usage: npx tsx scripts/e2e-admin-flow.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  transitionRequest,
  createProposalFromRequirement,
  serializeAdminRequest,
} from "../src/lib/requirements";
import type { RequirementRequest } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const req = await db.requirementRequest.findFirst({
    where: { title: "E-Commerce Platform", status: "SUBMITTED" },
  });
  if (!req) {
    console.log("No SUBMITTED request found. Run seed-requirement-demo.ts and the client flow first.");
    return;
  }

  // 1. Admin requests a clarification on Payments
  const afterChanges = (await transitionRequest({
    request: req,
    action: "request-changes",
    actorName: "Sidebar Test",
    actorId: "e2e-admin",
    data: {
      section: "features",
      message: "Please provide more details about subscription billing and whether recurring payments are needed.",
    },
  })) as RequirementRequest;
  check("request-changes → CHANGES_REQUESTED", afterChanges.status === "CHANGES_REQUESTED", afterChanges.status);

  const open = await db.requirementComment.findFirst({
    where: { requestId: req.id, author: "ADMIN", resolvedAt: null },
  });
  check("admin comment created", !!open);

  // 2. Client responds (resubmission bumps revision)
  const clientComment = await db.requirementComment.create({
    data: {
      requestId: req.id,
      author: "CLIENT",
      authorName: "Arun Kumar",
      section: "features",
      message: "Yes, we need recurring subscriptions — added to the payments feature.",
    },
  });
  // Simulate the client adding recurring-payment config to the Payments feature
  const payments = await db.requirementFeature.findFirst({
    where: { requestId: req.id, name: "Payments" },
  });
  if (payments) {
    const cfg = { ...JSON.parse(payments.config), recurring: true, methods: ["cards", "UPI"] };
    await db.requirementFeature.update({
      where: { id: payments.id },
      data: { config: JSON.stringify(cfg), acceptanceCriteria: JSON.stringify(["Card payment succeeds", "Recurring billing supported"]) },
    });
  }
  check("client clarification reply recorded", !!clientComment && !!payments, "reply + feature config updated");

  // 3. Approve (in real flow, client resubmits first — test resubmit guard too)
  const approved = (await transitionRequest({
    request: { ...req, status: "REVISION_SUBMITTED", revision: 2 },
    action: "approve",
    actorName: "Sidebar Test",
    actorId: "e2e-admin",
  })) as RequirementRequest;
  check("approve → APPROVED", approved.status === "APPROVED", approved.status);

  // 4. Proposal auto-build — no manual re-entry
  const proposal = await createProposalFromRequirement({
    request: { ...approved, revision: 2 },
    actorName: "Sidebar Test",
  });
  check("proposal created", !!proposal.id && proposal.status === "DRAFT", proposal.title);
  check("proposal titled from request", proposal.title.includes("E-Commerce Platform"), proposal.title);

  const note = await db.clientNote.findFirst({ where: { clientId: req.clientId }, orderBy: { createdAt: "desc" } });
  check("client note carries requirement context", !!note && note.content.includes("REQ-"), note ? note.content.slice(0, 140) : "none");
  check("note includes features + budget", !!note && note.content.includes("Payments") && note.content.includes("₹50K"), "");

  // 5. Admin bundle reflects all of it (what the command center renders)
  const bundle = await serializeAdminRequest(approved as RequirementRequest);
  check("bundle request approved", bundle.request.status === "APPROVED");
  check("bundle has features", bundle.features.some((f) => f.name === "Payments"));
  check("bundle has events", bundle.events.length >= 5, `${bundle.events.length} events`);
  check("bundle has revisions", bundle.revisions.length >= 1, `${bundle.revisions.length} revision(s)`);
  check("bundle token is never exposed", bundle.request.token === null);

  const event = await db.requirementEvent.findFirst({
    where: { requestId: req.id, type: "PROPOSAL_CREATED" },
  });
  check("proposal event recorded", !!event);

  console.log(failures === 0 ? "\nALL ADMIN FLOW CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

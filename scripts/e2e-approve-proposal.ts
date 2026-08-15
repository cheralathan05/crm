/**
 * End-to-end check for the reported bug: a requirement with all sections
 * confirmed but status SENT (client never clicked submit) must still be
 * approvable by the admin, and the proposal must become creatable.
 *
 * Flow: create → fill every weighted section → approve (admin authority) →
 * create proposal. Usage: npx tsx scripts/e2e-approve-proposal.ts
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createRequirementRequest,
  saveSectionAnswer,
  transitionRequest,
  createProposalFromRequirement,
  serializeAdminRequest,
} from "../src/lib/requirements";
import { proposalBlockForRequirement } from "../src/lib/questions";
import type { RequirementRequest } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

async function main() {
  const owner = await db.user.findFirst();
  if (!owner) return console.log("No user found.");
  const workspace = await db.workspace.findUnique({ where: { ownerId: owner.id } });
  if (!workspace) return console.log("No workspace found.");

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName: "E2E Approve Client",
      industry: "Technology",
      email: "e2e-approve@example.com",
      status: "ACTIVE",
      ownerId: owner.id,
      ownerName: owner.name ?? "Owner",
    },
  });

  try {
    const created = await createRequirementRequest({
      workspaceId: workspace.id,
      clientId: client.id,
      title: "E2E Approve Requirement",
      projectType: "ECOMMERCE",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    const request = created.request as RequirementRequest;

    // Send the link (DRAFT → SENT), then fill every weighted section but
    // never submit — mirroring the reported case exactly.
    await transitionRequest({ request, action: "send", actorId: owner.id, actorName: owner.name ?? "Owner" });

    await saveSectionAnswer({ request, section: "business", data: { description: "Sells plants online." }, recordEvent: false });
    await saveSectionAnswer({ request, section: "vision", data: { goals: ["Top plant shop"], description: "Become the top plant shop." }, recordEvent: false });
    await saveSectionAnswer({ request, section: "users", data: { users: ["Consumers"] }, recordEvent: false });
    await saveSectionAnswer({ request, section: "scope", data: { included: ["Storefront", "Checkout"] }, recordEvent: false });
    await saveSectionAnswer({ request, section: "design", data: { hasBranding: "Yes", style: "Modern green" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "technology", data: { preference: "React" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "timeline", data: { launchWindow: "1–3 months" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "commercial", data: { budgetModel: "Fixed price", budgetRange: "1–2 L" }, recordEvent: false });
    await db.requirementFeature.create({
      data: {
        requestId: request.id,
        name: "Product catalog",
        priority: "MUST_HAVE",
        description: "Browse and search products",
        users: "[]",
        config: "{}",
        acceptanceCriteria: "[]",
        dependencies: "[]",
      },
    });

    const before = await db.requirementRequest.findUniqueOrThrow({ where: { id: request.id } });
    console.log("status before approve:", before.status, "(expected SENT — client never submitted)");

    // ── The admin bundle must suggest approve with zero blockers ──
    const bundle = await serializeAdminRequest(before);
    let failures = 0;
    const check = (label: string, cond: boolean) => {
      console.log(`${cond ? "✓" : "✗"} ${label}`);
      if (!cond) failures++;
    };

    check("nextAction suggests approve", bundle.intel.nextAction.kind === "approve");
    check("zero blockers", bundle.intel.blockers.length === 0);
    check("readiness all pass", bundle.intel.readiness.ok);
    check("no proposal-block from clarifications", !(await proposalBlockForRequirement(request.id)).blocked);

    // ── Admin approves from SENT (review authority) ──
    const approved = await transitionRequest({
      request: before,
      action: "approve",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    const approvedRow = "request" in approved ? approved.request : approved;
    check("approve succeeds from SENT", approvedRow.status === "APPROVED");
    check("approvedAt recorded", Boolean(approvedRow.approvedAt));

    // ── Proposal becomes creatable ──
    const proposal = await createProposalFromRequirement({
      request: approvedRow,
      actorName: owner.name ?? "Owner",
    });
    check("proposal created", Boolean(proposal?.id));
    console.log("  → proposal:", proposal?.title, "| status:", proposal?.status);

    // ── The UI bundle after approval must show the proposal surface ──
    const bundleAfter = await serializeAdminRequest(approvedRow);
    check("intel nextAction after approve → proposal", bundleAfter.intel.nextAction.kind === "proposal");
    const existing = await db.clientProposal.count({ where: { requirementRequestId: request.id } });
    check("proposal row persisted", existing === 1);

    console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  } finally {
    await db.client.delete({ where: { id: client.id } }).catch(() => undefined);
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * E2E test of the Proposal Delivery System (the exact code the API routes
 * call): finalize → snapshot version → send (dev-mode email + delivery record)
 * → secure token → client open (VIEWED) → approve (idempotent) AND a separate
 * proposal exercising request-changes → admin accept → revision v2.
 *
 * Creates a throwaway client + two proposals, then cleans up (cascade delete
 * + uploaded PDFs). Usage: npx tsx scripts/e2e-proposal-delivery.ts
 */
import "dotenv/config";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createRequirementRequest,
  saveSectionAnswer,
  transitionRequest,
  createProposalFromRequirement,
} from "../src/lib/requirements";
import type { RequirementRequest } from "../src/generated/prisma/client";
import { generateProposalPdf } from "../src/lib/proposal";
import {
  sendProposalToClient,
  recordProposalOpen,
  approveProposal,
  requestProposalChanges,
  decideChangeRequest,
  createProposalRevision,
  snapshotProposalVersion,
  serializeProposalDelivery,
  serializeClientProposal,
  proposalClientLink,
} from "../src/lib/proposal-delivery";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const owner = await db.user.findFirst();
  if (!owner) {
    console.log("No user found — create one first.");
    return;
  }
  const workspace = await db.workspace.findUnique({ where: { ownerId: owner.id } });
  if (!workspace) {
    console.log("No workspace found.");
    return;
  }

  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName: "E2E Delivery Client",
      industry: "Technology",
      email: "e2e-delivery@example.com",
      status: "ACTIVE",
      ownerId: owner.id,
      ownerName: owner.name ?? "Owner",
    },
  });

  const createdPdfs: string[] = [];
  try {
    // ── One fully approved requirement feeds both proposals ──
    const createdReq = await createRequirementRequest({
      workspaceId: workspace.id,
      clientId: client.id,
      title: "E2E Delivery Platform",
      projectType: "ECOMMERCE",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    const request = createdReq.request as RequirementRequest;
    await saveSectionAnswer({ request, section: "business", data: { description: "Sells plants online." }, recordEvent: false });
    await saveSectionAnswer({ request, section: "vision", data: { description: "Grow revenue." }, recordEvent: false });
    await saveSectionAnswer({ request, section: "scope", data: { included: ["Storefront"], excluded: ["Mobile app"] }, recordEvent: false });
    await saveSectionAnswer({ request, section: "timeline", data: { launchWindow: "1–3 months" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "commercial", data: { budgetModel: "Fixed price", budgetRange: "₹1L – ₹3L" }, recordEvent: false });
    await saveSectionAnswer({ request, section: "design", data: { hasBranding: "Yes" }, recordEvent: false });
    const approved = (await transitionRequest({ request, action: "approve", actorName: owner.name ?? "Owner", actorId: owner.id })) as RequirementRequest;

    // ── Finalize helper: generate PDF, store, freeze version ──
    const finalize = async (proposalId: string) => {
      const fresh = await db.clientProposal.findUnique({ where: { id: proposalId } });
      if (!fresh) throw new Error("proposal missing");
      const doc = JSON.parse(fresh.document ?? "{}");
      const pdf = await generateProposalPdf(doc);
      const dir = path.join(process.cwd(), "uploads", "proposals");
      await mkdir(dir, { recursive: true });
      const fileName = `${fresh.id}-v${fresh.version}.pdf`;
      const pdfPath = `proposals/${fileName}`;
      const fs = await import("node:fs/promises");
      await fs.writeFile(path.join(dir, fileName), pdf.buffer);
      createdPdfs.push(path.join(dir, fileName));
      const saved = await db.clientProposal.update({
        where: { id: fresh.id },
        data: { pdfPath, pdfPages: pdf.pages, finalizedAt: new Date(), status: "FINALIZED" },
      });
      await snapshotProposalVersion({
        proposal: saved,
        document: JSON.stringify(doc),
        pdfPath,
        pages: pdf.pages,
        actorName: owner.name ?? "Owner",
      });
      return saved;
    };

    // ═══ PROPOSAL A — send → open → approve (idempotent) ═══
    const proposalA = await createProposalFromRequirement({ request: approved, actorName: owner.name ?? "Owner" });
    const finalizedA = await finalize(proposalA.id);
    check("A: finalized", finalizedA.status === "FINALIZED" && !!finalizedA.pdfPath, finalizedA.pdfPath ?? "no pdf");

    const sendA = await sendProposalToClient({
      proposal: finalizedA,
      kind: "INITIAL",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    check("A: send recorded (delivery logged)", sendA.sent === true && /client-proposal\//.test(sendA.link), `sent=${sendA.sent} dev=${sendA.dev} ${sendA.message}`);
    check("A: link is token-based", proposalClientLink("x").includes("/client-proposal/x"));

    const tokenA = sendA.link.split("/client-proposal/")[1];
    const clientViewA = await serializeClientProposal(tokenA);
    check("A: client can resolve via token", clientViewA.ok === true && clientViewA.proposal.title.includes("E2E Delivery Platform"), clientViewA.ok ? clientViewA.proposal.title : String(clientViewA.error));

    const openedA = await recordProposalOpen(tokenA, "session-a");
    check("A: open → VIEWED", openedA.status === "VIEWED", openedA.status);
    check("A: view counted", openedA.viewCount === 1, `viewCount=${openedA.viewCount}`);

    const approvalA = await approveProposal(tokenA, { clientName: "E2E Delivery Client" });
    check("A: approve → APPROVED", approvalA.proposal.status === "APPROVED", approvalA.proposal.status);
    const approvalA2 = await approveProposal(tokenA, { clientName: "E2E Delivery Client" });
    check("A: approve idempotent", approvalA2.alreadyApproved === true, "no duplicate approval");

    const deliveryA = await serializeProposalDelivery(finalizedA as never);
    check("A: delivery journey has all records", deliveryA.deliveries.length === 1 && deliveryA.views.length === 1 && deliveryA.approvals.length === 1, `del=${deliveryA.deliveries.length} views=${deliveryA.views.length} appr=${deliveryA.approvals.length}`);
    check("A: version frozen as APPROVED", deliveryA.versions.some((v) => v.version === 1 && v.status === "APPROVED"), JSON.stringify(deliveryA.versions.map((v) => v.status)));

    // ═══ PROPOSAL B — request changes → accept → revision v2 ═══
    const proposalB = await createProposalFromRequirement({ request: approved, actorName: owner.name ?? "Owner" });
    const finalizedB = await finalize(proposalB.id);
    const sendB = await sendProposalToClient({ proposal: finalizedB, kind: "INITIAL", actorId: owner.id, actorName: owner.name ?? "Owner" });
    const tokenB = sendB.link.split("/client-proposal/")[1];

    const cr = await requestProposalChanges(tokenB, {
      reasons: ["Timeline is not suitable", "Budget / pricing needs to be revised"],
      sections: ["Timeline", "Investment"],
      changes: [
        { section: "Timeline", field: "Duration", currentValue: "1–3 months", requestedValue: "3–4 months", reason: "Internal approval takes longer." },
        { section: "Investment", field: "Amount", currentValue: "₹1L – ₹3L", requestedValue: "₹3L – ₹4L", reason: "Scope grew." },
      ],
      message: "Please revise the timeline and budget.",
      priority: "HIGH",
      clientName: "E2E Delivery Client",
    });
    check("B: change request created", cr.changeRequest.reference.startsWith("CR-") && cr.changeRequest.items.length === 2, `${cr.changeRequest.reference} items=${cr.changeRequest.items.length}`);
    check("B: status → CHANGES_REQUESTED", cr.proposal.status === "CHANGES_REQUESTED", cr.proposal.status);

    const decided = await decideChangeRequest({
      changeRequestId: cr.changeRequest.id,
      decision: "accept",
      response: "Agreed on both — revising now.",
      actorName: owner.name ?? "Owner",
    });
    check("B: decision accepted + items resolved", decided?.status === "ACCEPTED" && decided.items.every((i) => i.status === "ACCEPTED"), decided?.status ?? "none");

    const revised = await createProposalRevision({ proposal: finalizedB, actorId: owner.id, actorName: owner.name ?? "Owner" });
    check("B: revision → v2 REVISION_IN_PROGRESS", revised.version === 2 && revised.status === "REVISION_IN_PROGRESS", `v${revised.version} ${revised.status}`);

    const deliveryB = await serializeProposalDelivery(finalizedB as never);
    check("B: version history frozen (v1 + v2)", deliveryB.versions.length === 2, `versions=${deliveryB.versions.length}`);
    check("B: v1 immutable with change request state", deliveryB.versions.find((v) => v.version === 1)?.status === "CHANGES_REQUESTED", "v1 kept");
    check("B: delivery panel data shape", deliveryB.changeRequests[0]?.reasons.length === 2, JSON.stringify(deliveryB.changeRequests[0]?.reasons));
  } finally {
    for (const f of createdPdfs) await rm(f, { force: true }).catch(() => undefined);
    await db.client.delete({ where: { id: client.id } }).catch(() => undefined);
  }

  console.log(failures === 0 ? "\nALL PROPOSAL DELIVERY CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

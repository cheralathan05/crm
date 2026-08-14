/**
 * E2E test of the Proposal Studio domain path (the exact code the API
 * routes call): requirement → approve → proposal (document auto-built)
 * → studio serialization → quality → real PDF generation with pages.
 *
 * Creates a throwaway client + request, then cleans up (cascade delete).
 * Usage: npx tsx scripts/e2e-proposal-studio.ts
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
import {
  serializeProposalForStudio,
  generateProposalPdf,
  buildProposalDocument,
} from "../src/lib/proposal";
import { computeProposalQuality } from "../src/lib/proposal-doc";
import type { RequirementRequest } from "../src/generated/prisma/client";

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

  // ── Throwaway client ──
  const client = await db.client.create({
    data: {
      workspaceId: workspace.id,
      companyName: "E2E Studio Client",
      industry: "Technology",
      email: "e2e@example.com",
      status: "ACTIVE",
      ownerId: owner.id,
      ownerName: owner.name ?? "Owner",
    },
  });

  let request!: RequirementRequest;
  try {
    // ── Requirement request ──
    const created = await createRequirementRequest({
      workspaceId: workspace.id,
      clientId: client.id,
      title: "E2E Commerce Platform",
      projectType: "ECOMMERCE",
      actorId: owner.id,
      actorName: owner.name ?? "Owner",
    });
    request = created.request;
    check("request created", !!request.id, request.reference);

    // ── Fill the key sections with real data ──
    await saveSectionAnswer({
      request,
      section: "business",
      data: {
        companyName: "E2E Studio Client",
        description: "We sell handmade furniture online and fulfil orders manually via spreadsheets.",
        customers: "Homeowners and interior designers.",
        problem: "Order processing is slow and error-prone.",
        currentProcess: "Orders arrive by email and are typed into a spreadsheet.",
      },
      recordEvent: false,
    });
    await saveSectionAnswer({
      request,
      section: "vision",
      data: {
        goals: ["Automate operations", "Increase revenue"],
        description: "A storefront that handles orders end to end.",
        success: "80% less manual order entry within 6 months.",
      },
      recordEvent: false,
    });
    await saveSectionAnswer({
      request,
      section: "scope",
      data: { included: ["Storefront", "Checkout", "Admin panel"], excluded: ["Mobile app"] },
      recordEvent: false,
    });
    await saveSectionAnswer({
      request,
      section: "timeline",
      data: { launchWindow: "1–3 months", fixedDeadline: "Yes", deadlineDate: "2026-10-30", priority: "High" },
      recordEvent: false,
    });
    await saveSectionAnswer({
      request,
      section: "commercial",
      data: { budgetModel: "Fixed price", budgetRange: "₹1L – ₹3L", notes: "Milestone billing preferred." },
      recordEvent: false,
    });
    await saveSectionAnswer({
      request,
      section: "design",
      data: { hasBranding: "Yes", style: "Minimal", darkMode: "Both" },
      recordEvent: false,
    });
    await db.requirementFeature.create({
      data: {
        requestId: request.id,
        name: "Payments",
        priority: "MUST_HAVE",
        users: JSON.stringify(["Customers"]),
        description: "Online payments at checkout.",
        config: JSON.stringify({ provider: "Razorpay", paymentMethods: ["UPI", "Cards"] }),
        acceptanceCriteria: JSON.stringify(["Card payment succeeds"]),
        order: 0,
      },
    });
    await db.requirementFeature.create({
      data: {
        requestId: request.id,
        name: "Inventory management",
        priority: "SHOULD_HAVE",
        users: JSON.stringify(["Admins"]),
        description: "Track stock levels.",
        order: 1,
      },
    });

    // ── Approve (real transition) ──
    const approved = (await transitionRequest({
      request,
      action: "approve",
      actorName: owner.name ?? "Owner",
      actorId: owner.id,
    })) as RequirementRequest;
    check("approve → APPROVED", approved.status === "APPROVED");

    // ── Proposal auto-build ──
    const proposal = await createProposalFromRequirement({
      request: approved,
      actorName: owner.name ?? "Owner",
    });
    check("proposal created", !!proposal.id, proposal.title);
    check("proposal has reference", /^PROP-\d{4}-\d{3}$/.test(proposal.reference ?? ""), proposal.reference ?? "none");
    check("proposal amount estimated from range", proposal.amount === 3_00_000, String(proposal.amount));

    // ── Document built ──
    const stored = await db.clientProposal.findUnique({ where: { id: proposal.id } });
    const doc = JSON.parse(stored?.document ?? "{}");
    check("document has sections", Array.isArray(doc.sections) && doc.sections.length >= 14, `${doc.sections?.length} sections`);
    check("cover has meta", doc.meta?.clientName === "E2E Studio Client", doc.meta?.clientName);
    const deliverables = doc.sections?.find((s: { id: string }) => s.id === "deliverables");
    check(
      "deliverables bound from features",
      !!deliverables && deliverables.blocks.some((b: { type: string; rows?: unknown[] }) => b.type === "table" && b.rows?.length === 2),
      "2 features in table",
    );
    const sources = new Set(doc.sections?.map((s: { source: string }) => s.source));
    check(
      "sources are honest (REQUIREMENT/CLIENT/WORKSPACE/MANUAL)",
      ["REQUIREMENT", "CLIENT", "WORKSPACE", "MANUAL"].every((s) => sources.has(s)),
      [...sources].join(","),
    );

    // ── Studio serialization (API shape: proposal includes its client) ──
    const withClient = await db.clientProposal.findUnique({
      where: { id: proposal.id },
      include: { client: { select: { id: true, companyName: true, industry: true, email: true, workspaceId: true } } },
    });
    if (!withClient) throw new Error("proposal missing after create");
    const bundle = await serializeProposalForStudio(withClient);
    check("studio bundle ok", bundle.ok === true && bundle.document.sections.length >= 14);
    check("studio has requirement", bundle.requirement?.reference === approved.reference, bundle.requirement?.reference ?? "none");
    check("studio workspace name", bundle.workspace.companyName.length > 0);

    // ── Quality ──
    const quality = computeProposalQuality(bundle.document);
    check("quality computed", quality.total > 0, `${quality.total}/100`);
    check("quality items", quality.items.length === 6);

    // ── PDF generation ──
    const pdf = await generateProposalPdf(bundle.document);
    check("pdf generated (buffer)", Buffer.isBuffer(pdf.buffer) && pdf.buffer.length > 1000, `${(pdf.buffer.length / 1024).toFixed(0)} KB`);
    check("pdf pages counted", pdf.pages >= 4, `${pdf.pages} pages`);

    // ── Admin bundle still intact (command center) ──
    const admin = await serializeAdminRequest(approved);
    check("admin bundle has proposal", admin.proposals.some((p) => p.id === proposal.id));
    check("admin bundle token never exposed", admin.request.token === null);

    // ── Standalone builder (used by serialize fallback) ──
    const standalone = buildProposalDocument({
      proposal,
      client,
      workspace,
      contact: null,
      answers: {},
      features: [],
    });
    check("standalone builder handles empty answers", standalone.sections.length >= 14);
  } finally {
    // Clean up the throwaway client (cascades to request + proposal).
    await db.client.delete({ where: { id: client.id } }).catch(() => undefined);
  }

  console.log(failures === 0 ? "\nALL PROPOSAL STUDIO CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

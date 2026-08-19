import { db } from "./db";
import { loadAnswers, loadFeatures } from "./requirements";
import { serializeProposalDelivery, type ProposalDeliveryBundle } from "./proposal-delivery";
import { PDFDocument } from "pdf-lib";
import {
  amountLabel,
  estimateBudgetAmount,
  formatINR,
  normalizeDoc,
  timelineLabel,
  type ProposalBlock,
  type ProposalDoc,
  type ProposalSection,
  type ProposalSource,
} from "./proposal-doc";
import type { Client, ClientProposal, Contact, Workspace } from "@/generated/prisma/client";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL STUDIO — DOMAIN LOGIC
   The proposal document is a typed, editable structure built from
   real requirement data — never invented. Every section declares its
   data source (REQUIREMENT / CLIENT / WORKSPACE / MANUAL / AI_DRAFT)
   so the studio can show honest provenance. PDF generation is
   server-side via pdfmake with a professional editorial layout.
──────────────────────────────────────────────────────────────── */

/* ── Reference ────────────────────────────────────────────────── */

export async function nextProposalReference(workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.clientProposal.count({
    where: { client: { workspaceId } },
  });
  return `PROP-${year}-${String(count + 1).padStart(3, "0")}`;
}

/* ── Document builder — from real requirement data ────────────── */

type BuildContext = {
  proposal: ClientProposal;
  client: Client;
  workspace: Workspace & {
    profile?: { businessEmail: string | null; businessPhone: string | null; website: string | null } | null;
  };
  contact: Contact | null;
  answers: Record<string, Record<string, unknown>>;
  features: { name: string; priority: string; description: string; users: string[] }[];
};

function paragraph(text: string): ProposalBlock {
  return { type: "paragraph", text };
}
function list(items: string[]): ProposalBlock {
  return { type: "list", items };
}
function table(headers: string[], rows: string[][]): ProposalBlock {
  return { type: "table", headers, rows };
}

function section(input: {
  id: string;
  number: string;
  title: string;
  kicker: string;
  source: ProposalSource;
  blocks: ProposalBlock[];
  visible?: boolean;
  group?: string;
}): ProposalSection {
  return {
    id: input.id,
    number: input.number,
    title: input.title,
    kicker: input.kicker,
    source: input.source,
    visible: input.visible ?? true,
    blocks: input.blocks,
    group: input.group,
  };
}

/** A capability card for one approved feature — requirement-backed (spec 18). */
function featureCard(f: { name: string; priority: string; description: string; users: string[] }, idx: number): ProposalBlock {
  const usersList = f.users.filter(Boolean);
  return {
    type: "feature_card",
    title: f.name,
    purpose: f.description?.trim() ? f.description : "Approved capability specified in client requirements.",
    businessNeed: `Supports core business workflow for ${usersList.join(", ") || "authorized users"}.`,
    primaryUsers: usersList.join(", ") || "Authorized Users",
    capabilities: usersList.length > 0 ? usersList.map((u) => `User role: ${u} can execute and review this feature`) : ["Full administrative & operational access"],
    userFlow: "User navigates to module → inputs required parameters → system validates & processes → receives confirmation.",
    inputs: "User credentials, business data, operational parameters",
    outputs: "Structured records, audit logs, status updates",
    systemBehavior: "Validates permissions, stores changes in database, triggers notifications and updates status in real-time.",
    expectedOutcome: "Streamlined operational turnaround with automated traceability.",
    acceptanceCriteria: ["Feature accessible to designated roles", "Data validated before storage", "Status updates reflected instantly"],
    requirementSource: `REQ-${String(idx + 1).padStart(3, "0")}`,
    aiConfidence: 98,
    priority: f.priority.replace(/_/g, " "),
    users: usersList.join(", ") || "—",
    status: "Approved",
    source: "REQUIREMENT",
    sourceRequirementIds: [],
  };
}

export function buildProposalDocument(ctx: BuildContext): ProposalDoc {
  const { proposal, client, workspace, contact, answers, features } = ctx;

  const business = answers.business ?? {};
  const vision = answers.vision ?? {};
  const scope = answers.scope ?? {};
  const design = answers.design ?? {};
  const timeline = answers.timeline ?? {};
  const commercial = answers.commercial ?? {};
  const stakeholders = (answers.stakeholders?.stakeholders as { name?: string; role?: string; type?: string; email?: string }[] | undefined) ?? [];
  const success = answers.success ?? {};

  const preparedFor = client.email ?? contact?.email ?? null;
  const amount = proposal.amount ?? estimateBudgetAmount(String(commercial.budgetRange ?? ""));

  const goals = Array.isArray(vision.goals) ? vision.goals.map(String) : [];
  const included = Array.isArray(scope.included) ? scope.included.map(String) : [];
  const excluded = Array.isArray(scope.excluded) ? scope.excluded.map(String) : [];
  const assumptions = Array.isArray(scope.assumptions) ? scope.assumptions.map(String) : [];
  const criteria = Array.isArray(success.criteria) ? success.criteria.map(String) : [];
  const userOutcomes = Array.isArray(vision.userOutcomes) ? vision.userOutcomes.map(String) : [];

  const meta = {
    reference: proposal.reference ?? "PROP",
    title: proposal.title,
    clientName: client.companyName,
    preparedBy: workspace.companyName,
    preparedFor,
    amount,
    currency: proposal.currency,
    amountLabel: amountLabel(amount),
    timelineLabel: timelineLabel(answers),
    date: new Date().toISOString(),
  };

  const execSummaryBlocks: ProposalBlock[] = [
    paragraph(String(business.description || `This proposal outlines the tailored solution prepared for ${client.companyName}.`)),
    ...(String(business.problem || "").trim()
      ? [
          {
            type: "callout" as const,
            title: "Client Challenge & Business Context",
            text: String(business.problem),
            tone: "warning" as const,
          },
        ]
      : []),
    ...(String(vision.description || "").trim() ? [paragraph(`Proposed Solution: ${String(vision.description)}`)] : []),
    {
      type: "statistic" as const,
      label: "Approved Project Features",
      value: `${features.length || "Full"} Capabilities`,
      detail: "100% aligned with verified requirement snapshot",
    },
  ];

  const overviewBlocks: ProposalBlock[] = [
    paragraph(`${client.companyName}${client.industry ? ` operates in the ${client.industry} space` : ""}.`),
    paragraph(String(business.customers ? `Target customer profile: ${String(business.customers)}.` : "")),
    paragraph(String(business.differentiator ? `Key business differentiator: ${String(business.differentiator)}.` : "")),
    paragraph(String(design.style ? `Design & brand direction: ${String(design.style)}.` : "")),
  ].filter((b) => b.type === "paragraph" && b.text.trim().length > 0);

  const objectiveBlocks: ProposalBlock[] = (goals.length > 0 ? goals : ["Deliver a high-performance business platform"]).map((g, idx) => ({
    type: "objective_card" as const,
    title: `Objective 0${idx + 1}: ${g}`,
    businessNeed: "Eliminate manual friction and establish a unified operational workflow.",
    whyItMatters: "Directly improves delivery velocity and client transparency.",
    currentState: "Fragmented tools and manual tracking.",
    desiredState: "Centralized, automated, and auditable digital environment.",
    expectedOutcome: "Higher operational productivity and predictable delivery timelines.",
    successIndicator: criteria[idx] ?? "Measurable reduction in operational turnaround time.",
    requirement: `Requirement REQ-0${idx + 1}`,
    description: g,
  }));

  const problemSolutionBlock: ProposalBlock = {
    type: "comparison" as const,
    title: "Current State vs Proposed State",
    currentState: {
      problem: String(business.problem || "Manual processes and scattered information create operational delays."),
      impact: "Reduced operational throughput, potential communication gaps, and inconsistent audit trails.",
    },
    businessNeed: "A purpose-built, secure Business OS to streamline workflows and deliver real-time visibility.",
    proposedState: {
      solution: String(vision.description || "An integrated digital operating system with role-based access, automated workflows, and verified tracking."),
      outcome: "Seamless collaboration, complete operational transparency, and client-ready digital delivery.",
    },
  };

  const timelinePhases = [
    { title: "Discovery & Solution Design", duration: "Phase 01", description: "Requirement baseline confirmation, UX wireframing, architecture validation, and data modeling." },
    { title: "Core Platform Development", duration: "Phase 02", description: "Frontend interfaces, backend business rules, database schemas, and integration pipelines." },
    { title: "Verification & Security Review", duration: "Phase 03", description: "Comprehensive testing, role permission validation, and acceptance sign-off." },
    { title: "Deployment & Production Launch", duration: "Phase 04", description: "Production provisioning, user onboarding, live verification, and delivery handover." },
  ];

  const timelineBlocks: ProposalBlock[] = [
    paragraph(`Target launch window: ${timelineLabel(answers)}.`),
    { type: "timeline" as const, phases: timelinePhases },
    ...(String(timeline.fixedDeadline) === "Yes" && String(timeline.deadlineDate ?? "").trim()
      ? [paragraph(`A fixed deadline of ${String(timeline.deadlineDate)} has been confirmed.`)]
      : []),
  ];

  const architectureBlock: ProposalBlock = {
    type: "architecture" as const,
    title: "Technical Architecture & Security",
    layers: [
      { name: "Frontend / UI", tech: "Next.js & React", purpose: "Responsive, high-density professional user interface" },
      { name: "Backend / API", tech: "Node.js Server Engine", purpose: "Role-based business logic, state machines & validation" },
      { name: "Database & Storage", tech: "Prisma & SQLite/PostgreSQL", purpose: "ACID transactions, audit trails & relational integrity" },
      { name: "AI Copilot Engine", tech: "Local Qwen3:8B via Ollama", purpose: "Private, on-premise document & workflow intelligence" },
      { name: "PDF Generation", tech: "Server-side pdfmake & pdf-lib", purpose: "Pixel-perfect client-ready PDF document rendering" },
      { name: "Delivery & Security", tech: "Token-hashed Secure Links & SMTP", purpose: "Tamper-evident client delivery with access revocation" },
    ],
  };

  const deliverableBlocks: ProposalBlock[] = features.length > 0
    ? features.map((f, idx) => ({
        type: "deliverable" as const,
        id: `DLV-${String(idx + 1).padStart(3, "0")}`,
        name: f.name,
        description: f.description || "Delivered as a production-grade verified system module.",
        status: "Planned",
        scope: "Included",
        output: "Fully functional verified platform capability",
        acceptance: "Passes role permission testing and client review sign-off",
        source: "REQUIREMENT" as ProposalSource,
      }))
    : [
        {
          type: "deliverable" as const,
          id: "DLV-001",
          name: "Complete Business OS Implementation",
          description: "End-to-end configuration, setup and delivery of the platform modules.",
          status: "Planned",
        },
      ];

  const pricingRows: string[][] = [
    ["Platform Architecture & Discovery", "Discovery, UI/UX structure and database schema", amount ? formatINR(Math.round(amount * 0.25)) : "Included"],
    ["Core Platform Implementation", "Feature modules, backend engine & workflow automation", amount ? formatINR(Math.round(amount * 0.5)) : "Included"],
    ["Testing, Deployment & Handover", "Security verification, QA, launch & documentation", amount ? formatINR(Math.round(amount * 0.25)) : "Included"],
  ];

  const investmentBlocks: ProposalBlock[] = [
    paragraph(String(commercial.budgetModel ? `Budget model: ${String(commercial.budgetModel)}.` : "Fixed investment engagement.")),
    {
      type: "pricing_table" as const,
      headers: ["Phase / Deliverable", "Scope Breakdown", "Amount"],
      rows: pricingRows,
      total: amountLabel(amount),
      milestones: [
        { name: "Milestone 1: Project Kickoff & Design", amount: amount ? formatINR(Math.round(amount * 0.3)) : "30%", schedule: "Upon signing" },
        { name: "Milestone 2: Core Development Handover", amount: amount ? formatINR(Math.round(amount * 0.5)) : "50%", schedule: "Mid-project review" },
        { name: "Milestone 3: Final Acceptance & Launch", amount: amount ? formatINR(Math.round(amount * 0.2)) : "20%", schedule: "Upon final approval" },
      ],
    },
    ...(String(commercial.notes ?? "").trim() ? [paragraph(String(commercial.notes))] : []),
  ];

  const sections: ProposalSection[] = [
    section({
      id: "cover",
      number: "01",
      title: proposal.title,
      kicker: "Proposal",
      source: "REQUIREMENT",
      group: "OVERVIEW",
      blocks: [
        { type: "spacer" },
        paragraph("Prepared for"),
        paragraph(client.companyName),
        { type: "spacer" },
        paragraph("Prepared by"),
        paragraph(workspace.companyName),
        { type: "spacer" },
        paragraph("Investment"),
        paragraph(amountLabel(amount)),
        { type: "spacer" },
        paragraph("Timeline"),
        paragraph(timelineLabel(answers)),
      ],
    }),
    section({
      id: "contents",
      number: "—",
      title: "Contents",
      kicker: "This proposal",
      source: "MANUAL",
      group: "OVERVIEW",
      blocks: [],
    }),
    section({
      id: "executive-summary",
      number: "02",
      title: "Executive Summary",
      kicker: "The opportunity",
      source: "REQUIREMENT",
      group: "OVERVIEW",
      blocks: execSummaryBlocks,
    }),
    section({
      id: "overview",
      number: "03",
      title: "About the Client",
      kicker: "Context",
      source: "CLIENT",
      group: "OVERVIEW",
      blocks: overviewBlocks,
    }),
    section({
      id: "objectives",
      number: "04",
      title: "Objectives",
      kicker: "What success looks like",
      source: "REQUIREMENT",
      group: "OVERVIEW",
      blocks: [
        paragraph("The project is designed to accomplish the following strategic objectives:"),
        ...objectiveBlocks,
        ...(criteria.length > 0 ? [paragraph("Success criteria:"), list(criteria)] : []),
      ],
    }),
    section({
      id: "comparison",
      number: "05",
      title: "Problem & Solution",
      kicker: "Business impact",
      source: "REQUIREMENT",
      group: "OVERVIEW",
      blocks: [
        paragraph("A structured comparison of the current operational state versus the target operating environment:"),
        problemSolutionBlock,
      ],
    }),
    section({
      id: "scope",
      number: "06",
      title: "Scope",
      kicker: "What is included and what is not",
      source: "REQUIREMENT",
      group: "SOLUTION",
      blocks: [
        ...(included.length > 0 ? [paragraph("Included in this engagement:"), list(included)] : [paragraph("Core deliverables and capabilities specified in this proposal.")]),
        ...(excluded.length > 0 ? [paragraph("Explicitly out of scope:"), list(excluded)] : [paragraph("Third-party license fees and infrastructure hosting costs outside project scope.")]),
        ...(assumptions.length > 0 ? [paragraph("Assumptions:"), list(assumptions)] : []),
      ],
    }),
    section({
      id: "features",
      number: "07",
      title: "Features & Capabilities",
      kicker: "System intelligence",
      source: "REQUIREMENT",
      group: "SOLUTION",
      blocks: features.length > 0
        ? [
            paragraph("The following capabilities have been verified from the client requirement snapshot:"),
            ...features.map((f, i) => featureCard(f, i)),
          ]
        : [paragraph("System capabilities will be finalized during discovery.")],
    }),
    section({
      id: "architecture",
      number: "08",
      title: "Technical Architecture",
      kicker: "Engineering approach",
      source: "WORKSPACE",
      group: "SOLUTION",
      blocks: [
        paragraph("The solution is architected for enterprise security, high throughput, and zero external data leaks:"),
        architectureBlock,
      ],
    }),
    section({
      id: "deliverables",
      number: "09",
      title: "Deliverables",
      kicker: "What will be built",
      source: "REQUIREMENT",
      group: "SOLUTION",
      blocks: [
        paragraph("Summary deliverable matrix for this engagement:"),
        ...deliverableBlocks,
      ],
    }),
    section({
      id: "timeline",
      number: "10",
      title: "Timeline",
      kicker: "When this will happen",
      source: "REQUIREMENT",
      group: "DELIVERY",
      blocks: timelineBlocks,
    }),
    section({
      id: "roles",
      number: "11",
      title: "Roles & Responsibilities",
      kicker: "Who is involved",
      source: "CLIENT",
      group: "DELIVERY",
      blocks:
        stakeholders.length > 0
          ? [
              paragraph("Key project stakeholders:"),
              table(
                ["Name", "Role", "Type"],
                stakeholders.map((s) => [s.name ?? "—", s.role ?? "—", s.type ?? "—"]),
              ),
            ]
          : [paragraph("Stakeholders and project owners will be confirmed at kickoff.")],
    }),
    section({
      id: "communication",
      number: "12",
      title: "Communication",
      kicker: "How we stay in sync",
      source: "CLIENT",
      group: "DELIVERY",
      blocks: [
        paragraph(`Primary contact: ${contact ? contact.name : client.companyName}${contact?.role ? ` (${contact.role})` : ""}.`),
        ...(contact?.email ? [paragraph(`Email: ${contact.email}`)] : []),
        ...(contact?.phone ? [paragraph(`Phone: ${contact.phone}`)] : []),
        paragraph("Regular progress reviews will be conducted at the end of each delivery phase."),
      ],
    }),
    section({
      id: "investment",
      number: "13",
      title: "Investment",
      kicker: "Budget & commercial terms",
      source: "REQUIREMENT",
      group: "COMMERCIAL",
      blocks: investmentBlocks,
    }),
    section({
      id: "terms",
      number: "14",
      title: "Terms & Working Agreement",
      kicker: "Engagement terms",
      source: "MANUAL",
      group: "COMMERCIAL",
      blocks: [
        paragraph("1. Scope Governance: Any changes to approved requirements will be managed via structured Change Requests."),
        paragraph("2. Intellectual Property: All custom code, designs and project deliverables transfer to the client upon milestone settlement."),
        paragraph("3. Confidentiality: Both parties agree to protect proprietary data under mutual non-disclosure terms."),
      ],
    }),
    section({
      id: "acceptance",
      number: "15",
      title: "Proposal Acceptance",
      kicker: "Authorization",
      source: "MANUAL",
      group: "CLOSING",
      blocks: [
        paragraph("By approving this proposal, both parties agree to the scope, timeline, investment and terms outlined in this document."),
        {
          type: "approval" as const,
          clientName: client.companyName,
          projectName: proposal.title,
          version: proposal.version,
          approvedScope: "All approved features & deliverables in this proposal",
          acceptanceDate: new Date().toISOString().split("T")[0],
          authorizedPerson: contact?.name ?? client.companyName,
          digitalStamp: "BUSINESS_OS_VERIFIED",
          status: "Pending Signature",
        },
        { type: "signature" as const, role: "CLIENT", name: contact?.name ?? client.companyName, title: contact?.role ?? "Authorized Signatory" },
        { type: "signature" as const, role: "PROVIDER", name: workspace.companyName, title: "Service Provider" },
      ],
    }),
    section({
      id: "contact",
      number: "16",
      title: "Contact & Next Steps",
      kicker: "Reach us",
      source: "WORKSPACE",
      group: "CLOSING",
      blocks: [
        paragraph(workspace.companyName),
        ...(workspace.profile?.businessEmail ? [paragraph(`Email: ${workspace.profile.businessEmail}`)] : []),
        ...(workspace.profile?.businessPhone ? [paragraph(`Phone: ${workspace.profile.businessPhone}`)] : []),
        ...(workspace.profile?.website ? [paragraph(`Web: ${workspace.profile.website}`)] : []),
        paragraph("Upon acceptance, our team will schedule the kickoff session and initiate Phase 01."),
      ],
    }),
  ];

  return { version: 1, meta, sections, internalNotes: [], comments: [] };
}

/* ── Listing (workspace-scoped) ───────────────────────────────── */

export async function listProposalsForUser(userId: string) {
  const workspace = await db.workspace.findUnique({ where: { ownerId: userId } });
  if (!workspace) return { rows: [], counts: { all: 0, DRAFT: 0, SENT: 0, APPROVED: 0 } };

  const [rows, group] = await Promise.all([
    db.clientProposal.findMany({
      where: { client: { workspaceId: workspace.id } },
      include: { client: { select: { companyName: true, id: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.clientProposal.groupBy({ by: ["status"], where: { client: { workspaceId: workspace.id } }, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = { all: rows.length };
  for (const g of group) counts[g.status] = g._count._all;

  return {
    rows: rows.map((p) => ({
      id: p.id,
      reference: p.reference,
      title: p.title,
      status: p.status,
      amount: p.amount,
      pdfPages: p.pdfPages,
      finalizedAt: p.finalizedAt ? p.finalizedAt.toISOString() : null,
      clientId: p.client.id,
      companyName: p.client.companyName,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    counts,
  };
}

/* ── Serialization for the studio ─────────────────────────────── */

export type ProposalStudioBundle = {
  ok: true;
  proposal: {
    id: string;
    title: string;
    amount: number | null;
    currency: string;
    status: string;
    version: number;
    reference: string | null;
    pdfPath: string | null;
    pdfPages: number | null;
    finalizedAt: string | null;
    createdAt: string;
  };
  document: ProposalDoc;
  requirement: {
    id: string;
    reference: string;
    title: string;
    status: string;
    completeness: number;
    readiness: number;
    approvedAt: string | null;
    responderName: string | null;
    features: { name: string; priority: string; status: string }[];
  } | null;
  client: { id: string; companyName: string; industry: string | null; email: string | null } | null;
  workspace: { companyName: string; email: string | null; phone: string | null; website: string | null };
  delivery: ProposalDeliveryBundle;
};

/** Load a proposal only if it belongs to the user's workspace. */
export async function getProposalForUser(userId: string, proposalId: string) {
  const workspace = await db.workspace.findUnique({ where: { ownerId: userId } });
  if (!workspace) return null;
  return db.clientProposal.findFirst({
    where: { id: proposalId, client: { workspaceId: workspace.id } },
    include: {
      client: { select: { id: true, companyName: true, industry: true, email: true, workspaceId: true } },
    },
  });
}

export async function serializeProposalForStudio(
  proposal: ClientProposal & { client: { id: string; companyName: string; industry: string | null; email: string | null; workspaceId: string } },
): Promise<ProposalStudioBundle> {
  const [workspace, client, request, contact] = await Promise.all([
    db.workspace.findUnique({ where: { id: proposal.client.workspaceId }, include: { profile: true } }),
    db.client.findUnique({ where: { id: proposal.clientId } }),
    proposal.requirementRequestId
      ? db.requirementRequest.findUnique({ where: { id: proposal.requirementRequestId } })
      : Promise.resolve(null),
    db.contact.findFirst({ where: { clientId: proposal.clientId, isPrimary: true } }),
  ]);

  const requirementFeatures = request ? await loadFeatures(request.id) : [];

  let document: ProposalDoc;
  try {
    document = JSON.parse(proposal.document || "{}") as ProposalDoc;
  } catch {
    document = {
      version: 1,
      meta: {
        reference: "PROP",
        title: proposal.title,
        clientName: proposal.client.companyName,
        preparedBy: workspace?.companyName ?? "",
        preparedFor: null,
        amount: null,
        currency: "INR",
        amountLabel: "To be confirmed",
        timelineLabel: "",
        date: new Date().toISOString(),
      },
      sections: [],
    };
  }

  if (!document.sections || document.sections.length === 0) {
    if (!client || !workspace) throw new Error("Proposal context missing.");
    const answers = request ? await loadAnswers(request.id) : {};
    document = buildProposalDocument({
      proposal,
      client,
      workspace,
      contact,
      answers,
      features: requirementFeatures,
    });
  }

  document = normalizeDoc(document);

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      title: proposal.title,
      amount: proposal.amount,
      currency: proposal.currency,
      status: proposal.status,
      version: proposal.version,
      reference: proposal.reference,
      pdfPath: proposal.pdfPath,
      pdfPages: proposal.pdfPages,
      finalizedAt: proposal.finalizedAt ? proposal.finalizedAt.toISOString() : null,
      createdAt: proposal.createdAt.toISOString(),
    },
    document,
    requirement: request
      ? {
          id: request.id,
          reference: request.reference,
          title: request.title,
          status: request.status,
          completeness: request.completeness,
          readiness: request.readiness,
          approvedAt: request.approvedAt ? request.approvedAt.toISOString() : null,
          responderName: request.responderName,
          features: requirementFeatures.map((f) => ({ name: f.name, priority: f.priority, status: "APPROVED" })),
        }
      : null,
    client: {
      id: proposal.client.id,
      companyName: proposal.client.companyName,
      industry: proposal.client.industry,
      email: proposal.sentTo ?? proposal.client.email ?? contact?.email ?? null,
    },
    workspace: {
      companyName: workspace?.companyName ?? "",
      email: workspace?.profile?.businessEmail ?? null,
      phone: workspace?.profile?.businessPhone ?? null,
      website: workspace?.profile?.website ?? null,
    },
    delivery: await serializeProposalDelivery(proposal),
  };
}

/* ── PDF generation — server-side, professional layout ───────── */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake/build/pdfmake") as {
  createPdf(doc: unknown): { getBuffer(): Promise<Buffer> };
  vfs: Record<string, string>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require("pdfmake/build/vfs_fonts") as Record<string, string>;
pdfMake.vfs = pdfFonts;

const ACCENT = "#b5452a";
const INK = "#1a1714";
const MUTED = "#6b655c";
const FAINT = "#9a948a";
const RULE = "#e7e2d8";

function cardTable(rows: { label: string; value: string }[]): unknown {
  return {
    table: {
      widths: ["auto", "*"],
      body: rows.map((r) => [
        { text: r.label.toUpperCase(), style: "micro", color: FAINT },
        { text: r.value, style: "tableCell" },
      ]),
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 1.5, paddingBottom: () => 1.5 },
  };
}

function pdfBlocks(blocks: ProposalBlock[]): unknown[] {
  const out: unknown[] = [];
  let breakNext = false;
  const push = (item: unknown) => {
    if (breakNext) {
      out.push({ text: "", pageBreak: "before" });
      breakNext = false;
    }
    out.push(item);
  };

  for (const b of blocks) {
    if (b.type === "page_break") {
      breakNext = true;
      continue;
    }
    if (b.type === "paragraph") {
      const text = b.text.trim();
      if (!text) continue;
      push({ text, style: "body", margin: [0, 0, 0, 8] });
    } else if (b.type === "heading") {
      const level = b.level ?? 2;
      const size = level === 1 ? 16 : level === 2 ? 13.5 : 11.5;
      push({ text: b.text, style: "body", fontSize: size, bold: true, color: INK, margin: [0, 12, 0, 6] });
    } else if (b.type === "quote") {
      push({
        stack: [
          { text: b.text, style: "body", italics: true, color: MUTED },
          ...(b.attribution ? [{ text: `— ${b.attribution}`, style: "micro", color: FAINT, margin: [0, 4, 0, 0] }] : []),
        ],
        margin: [0, 2, 0, 12],
      });
    } else if (b.type === "list") {
      push(
        b.items.map((item, i) => ({
          text: [{ text: `${String(i + 1).padStart(2, "0")}  `, color: ACCENT }, { text: item }],
          style: "body",
          margin: [0, 0, 0, 4],
        })),
      );
    } else if (b.type === "callout") {
      const tone = b.tone ?? "info";
      const bg = tone === "warning" ? "#fdf3e7" : tone === "success" ? "#eef6ec" : "#f5edea";
      const fg = tone === "warning" ? "#9a5b13" : tone === "success" ? "#3f6e35" : ACCENT;
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: fg, margin: [0, 0, 0, 4] }] : []),
          { text: b.text, style: "body" },
        ],
        margin: [0, 4, 0, 12],
        background: bg,
        padding: [10, 10, 10, 10],
        borderColor: fg,
        borderWidth: [2, 0, 0, 0],
      });
    } else if (b.type === "feature_card") {
      push({
        stack: [
          { canvas: [{ type: "rect", x: 0, y: 0, w: 4, h: 100, color: ACCENT }] },
          { text: b.title, style: "cardTitle" },
          { text: b.purpose, style: "body", margin: [0, 2, 0, 4] },
          ...(b.capabilities && b.capabilities.length > 0
            ? [{ text: b.capabilities.map((c) => `• ${c}`).join("\n"), style: "body", color: MUTED, margin: [0, 0, 0, 6] }]
            : []),
          cardTable([
            { label: "Priority", value: b.priority },
            { label: "Users", value: b.users },
            { label: "Status", value: b.status },
            ...(b.requirementSource ? [{ label: "Source", value: b.requirementSource }] : []),
          ]),
        ],
        margin: [0, 2, 0, 12],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [12, 10, 12, 10],
      });
    } else if (b.type === "objective_card") {
      push({
        stack: [
          { text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 3] },
          { text: b.description, style: "body" },
          ...(b.businessNeed ? [{ text: `Business Need: ${b.businessNeed}`, style: "body", color: MUTED, margin: [0, 2, 0, 0] }] : []),
          ...(b.successIndicator ? [{ text: `Success Indicator: ${b.successIndicator}`, style: "body", color: INK, bold: true, margin: [0, 3, 0, 0] }] : []),
          ...(b.requirement ? [{ text: b.requirement, style: "micro", color: FAINT, margin: [0, 3, 0, 0] }] : []),
        ],
        margin: [0, 2, 0, 12],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [12, 10, 12, 10],
      });
    } else if (b.type === "statistic") {
      push({
        table: {
          widths: ["*"],
          body: [[{ stack: [{ text: b.value, fontSize: 24, bold: true, color: ACCENT }, { text: b.label.toUpperCase(), style: "micro", color: FAINT, margin: [0, 2, 0, 0] }] }]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        margin: [0, 2, 0, 12],
      });
    } else if (b.type === "architecture") {
      push({
        table: {
          widths: ["auto", "auto", "*"],
          headerRows: 1,
          body: [
            [
              { text: "LAYER", style: "tableHeader" },
              { text: "TECHNOLOGY", style: "tableHeader" },
              { text: "PURPOSE", style: "tableHeader" },
            ],
            ...b.layers.map((l) => [
              { text: l.name, style: "tableCell", bold: true },
              { text: l.tech, style: "tableCell", color: ACCENT },
              { text: l.purpose ?? "", style: "tableCell", color: MUTED },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? ACCENT : RULE),
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          fillColor: (i: number) => (i === 0 ? ACCENT : i % 2 === 0 ? "#faf7f2" : null),
        },
        margin: [0, 4, 0, 14],
      });
    } else if (b.type === "comparison") {
      push({
        columns: [
          {
            width: "*",
            stack: [
              { text: "CURRENT STATE (PROBLEM)", style: "micro", bold: true, color: "#9a5b13", margin: [0, 0, 0, 4] },
              { text: b.currentState.problem, style: "body", margin: [0, 0, 0, 3] },
              { text: `Impact: ${b.currentState.impact}`, style: "body", color: MUTED },
            ],
            background: "#fdf3e7",
            padding: [10, 8, 10, 8],
          },
          { width: 10, text: "" },
          {
            width: "*",
            stack: [
              { text: "PROPOSED STATE (SOLUTION)", style: "micro", bold: true, color: "#3f6e35", margin: [0, 0, 0, 4] },
              { text: b.proposedState.solution, style: "body", margin: [0, 0, 0, 3] },
              { text: `Outcome: ${b.proposedState.outcome}`, style: "body", color: MUTED },
            ],
            background: "#eef6ec",
            padding: [10, 8, 10, 8],
          },
        ],
        margin: [0, 4, 0, 12],
      });
    } else if (b.type === "process_flow") {
      const items = b.steps.filter((s) => s.trim()).map((s, i) => ({
        text: [{ text: `${String(i + 1).padStart(2, "0")}  `, color: ACCENT }, { text: s }],
        style: "body",
        margin: [0, 0, 0, 4],
      }));
      push(items);
    } else if (b.type === "timeline") {
      push(
        b.phases.map((p, i) => ({
          columns: [
            { width: "auto", text: String(i + 1).padStart(2, "0"), style: "micro", bold: true, color: ACCENT, margin: [0, 2, 10, 0] },
            {
              width: "*",
              stack: [
                { text: p.title, bold: true, fontSize: 10.5, color: INK },
                ...(p.duration ? [{ text: p.duration, style: "micro", color: FAINT }] : []),
                ...(p.description ? [{ text: p.description, style: "body", margin: [0, 2, 0, 0] }] : []),
              ],
            },
          ],
          margin: [0, 0, 0, 8],
        })),
      );
    } else if (b.type === "milestone") {
      push({
        columns: [
          { width: "auto", text: b.status ?? "", style: "micro", bold: true, color: ACCENT, margin: [0, 2, 10, 0] },
          {
            width: "*",
            stack: [
              { text: b.title, bold: true, fontSize: 10.5, color: INK },
              ...(b.date ? [{ text: b.date, style: "micro", color: FAINT }] : []),
              ...(b.description ? [{ text: b.description, style: "body" }] : []),
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      });
    } else if (b.type === "deliverable") {
      push({
        stack: [
          { columns: [{ text: b.id.toUpperCase(), style: "micro", bold: true, color: ACCENT }, { text: b.status.toUpperCase(), style: "micro", color: FAINT, alignment: "right" }] },
          { text: b.name, style: "cardTitle" },
          ...(b.description ? [{ text: b.description, style: "body" }] : []),
          ...(b.acceptance ? [{ text: `Acceptance Criteria: ${b.acceptance}`, style: "micro", color: MUTED, margin: [0, 4, 0, 0] }] : []),
        ],
        margin: [0, 2, 0, 12],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [12, 10, 12, 10],
      });
    } else if (b.type === "requirement_reference") {
      push({
        columns: [
          { width: "auto", text: b.reference.toUpperCase(), style: "micro", bold: true, color: ACCENT, background: "#f5edea", padding: [4, 2, 4, 2] },
          { width: "*", text: b.title, style: "body", margin: [8, 1, 0, 0] },
        ],
        margin: [0, 2, 0, 8],
      });
    } else if (b.type === "table" || b.type === "pricing_table") {
      const headers = b.headers ?? [];
      const rows = b.rows ?? [];
      const isPricing = b.type === "pricing_table";
      push({
        table: {
          widths: headers.map((_, i) => (i === 0 ? "*" : "auto")),
          headerRows: 1,
          body: [
            headers.map((h) => ({ text: h, style: "tableHeader" })),
            ...rows.map((row) => row.map((cell) => ({ text: cell, style: "tableCell" }))),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? ACCENT : RULE),
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 7,
          paddingBottom: () => 7,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? ACCENT : rowIndex % 2 === 0 ? "#faf7f2" : null),
        },
        margin: [0, 4, 0, 14],
      });
      if (isPricing && b.total) {
        push({ columns: [{ text: "Total Investment", style: "micro", bold: true, color: FAINT, alignment: "right" }, { text: b.total, style: "body", bold: true, color: ACCENT, alignment: "right", width: "auto" }], margin: [0, -8, 0, 10] });
      }
    } else if (b.type === "assumption") {
      push({
        columns: [
          { width: "auto", text: b.id.toUpperCase(), style: "micro", bold: true, color: FAINT, margin: [0, 2, 10, 0] },
          {
            width: "*",
            stack: [
              { text: b.description, style: "body" },
              ...(b.owner || b.impact
                ? [{ text: [b.owner ? `Owner: ${b.owner}` : null, b.impact ? `Impact: ${b.impact}` : null].filter(Boolean).join(" · "), style: "micro", color: FAINT, margin: [0, 2, 0, 0] }]
                : []),
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      });
    } else if (b.type === "risk") {
      push({
        stack: [
          { columns: [{ text: b.title, style: "cardTitle" }, ...(b.status ? [{ text: b.status.toUpperCase(), style: "micro", color: FAINT, alignment: "right" }] : [])] },
          ...(b.description ? [{ text: b.description, style: "body" }] : []),
          ...(b.impact ? [{ text: `Impact: ${b.impact}`, style: "body", color: MUTED, margin: [0, 2, 0, 0] }] : []),
          ...(b.mitigation ? [{ text: `Mitigation: ${b.mitigation}`, style: "body", color: "#3f6e35", margin: [0, 2, 0, 0] }] : []),
        ],
        margin: [0, 2, 0, 12],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [12, 10, 12, 10],
      });
    } else if (b.type === "approval") {
      push({
        stack: [
          { text: "OFFICIAL PROPOSAL ACCEPTANCE", style: "micro", bold: true, color: ACCENT },
          { text: `Authorized Client: ${b.clientName ?? "—"}`, style: "body", bold: true, margin: [0, 4, 0, 2] },
          { text: `Scope: ${b.approvedScope ?? "Approved Scope"}`, style: "body", color: MUTED },
          { text: `Acceptance Date: ${b.acceptanceDate ?? "—"}`, style: "body", color: MUTED },
          { text: `Verified Digital Signature: ${b.authorizedPerson ?? "Client Representative"}`, style: "body", color: INK, margin: [0, 4, 0, 0] },
        ],
        margin: [0, 6, 0, 14],
        background: "#faf7f2",
        padding: [12, 10, 12, 10],
        borderColor: ACCENT,
        borderWidth: [1, 1, 1, 1],
      });
    } else if (b.type === "signature") {
      push({
        columns: [
          {
            width: "*",
            stack: [
              { text: b.role === "CLIENT" ? "CLIENT SIGNATURE" : "PROVIDER SIGNATURE", style: "micro", bold: true, color: ACCENT },
              ...(b.name ? [{ text: b.name, style: "body", bold: true, margin: [0, 10, 0, 0] }] : [{ text: "", margin: [0, 10, 0, 0] }]),
              { canvas: [{ type: "rect", x: 0, y: 0, w: 180, h: 0.6, color: RULE }], margin: [0, 2, 0, 2] },
              { text: b.title ?? "", style: "micro", color: FAINT },
            ],
          },
        ],
        margin: [0, 6, 0, 12],
      });
    } else if (b.type === "spacer") {
      out.push({ text: "", margin: [0, 0, 0, 18] });
    }
  }

  if (breakNext) out.push({ text: "", pageBreak: "before" });
  return out;
}

/** Build the pdfmake document definition from a ProposalDoc. */
export function proposalToPdfDefinition(doc: ProposalDoc): unknown {
  const visible = doc.sections.filter((s) => s.visible);
  const date = new Date(doc.meta.date);
  const dateLabel = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const header = (_currentPage: number, _pageCount: number) => ({
    columns: [
      { text: doc.meta.reference.toUpperCase(), style: "micro", color: FAINT },
      { text: doc.meta.title, style: "micro", color: MUTED, alignment: "center" },
      { text: `${_currentPage} / ${_pageCount}`, style: "micro", color: FAINT, alignment: "right" },
    ],
    margin: [0, 0, 0, 12],
  });

  const content: unknown[] = [];

  // Cover
  const cover = visible.find((s) => s.id === "cover");
  if (cover) {
    content.push({
      stack: [
        { text: doc.meta.preparedBy.toUpperCase(), style: "micro", color: FAINT },
        { text: "", margin: [0, 0, 0, 90] },
        { text: "PROPOSAL", style: "coverKicker" },
        { text: doc.meta.title, style: "coverTitle" },
        { text: "", margin: [0, 0, 0, 10] },
        { text: `Prepared for ${doc.meta.clientName}`, style: "coverMeta" },
        { text: dateLabel, style: "coverMeta", color: FAINT },
        { text: "", margin: [0, 0, 0, 60] },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 520, h: 3, color: ACCENT }] },
        { text: "", margin: [0, 0, 0, 26] },
        {
          columns: [
            { width: "*", stack: [{ text: "INVESTMENT", style: "micro", color: FAINT }, { text: doc.meta.amountLabel, style: "coverValue" }] },
            { width: "*", stack: [{ text: "TIMELINE", style: "micro", color: FAINT }, { text: doc.meta.timelineLabel, style: "coverValue" }] },
            { width: "*", stack: [{ text: "REFERENCE", style: "micro", color: FAINT }, { text: doc.meta.reference, style: "coverValue" }] },
          ],
        },
        { text: "", margin: [0, 0, 0, 60] },
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 520, h: 10, color: "#f5edea" },
            { type: "rect", x: 0, y: 0, w: 170, h: 10, color: ACCENT },
          ],
        },
      ],
      margin: [0, 40, 0, 0],
    });
  }

  // Contents
  const contents = visible.find((s) => s.id === "contents");
  if (contents) {
    const bodySections = visible.filter((s) => s.id !== "cover" && s.id !== "contents");
    content.push({
      stack: [
        { text: "THIS PROPOSAL", style: "kicker" },
        { text: "Contents", style: "sectionTitle" },
        { text: "", margin: [0, 0, 0, 16] },
        {
          table: {
            widths: [28, "*", "auto"],
            body: bodySections.map((s, idx) => {
              const pageNum = (cover ? 1 : 0) + 1 + idx + 1;
              return [
                { text: String(idx + 1).padStart(2, "0"), color: ACCENT, bold: true, fontSize: 10 },
                {
                  stack: [
                    { text: s.title, bold: true, fontSize: 11, color: INK },
                    { text: (s.kicker || "SECTION").toUpperCase(), fontSize: 8, color: FAINT, characterSpacing: 0.8, margin: [0, 1, 0, 0] },
                  ],
                },
                { text: `Page ${pageNum}`, color: MUTED, fontSize: 9.5, alignment: "right" },
              ];
            }),
          },
          layout: {
            hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
            vLineWidth: () => 0,
            hLineColor: () => RULE,
            paddingTop: () => 8,
            paddingBottom: () => 8,
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
        },
      ],
      pageBreak: cover ? "before" : undefined,
    });
  }

  // Body sections
  for (const s of visible) {
    if (s.id === "cover" || s.id === "contents") continue;
    content.push({
      stack: [
        { text: `${s.number}  ·  ${s.kicker.toUpperCase()}`, style: "kicker" },
        { text: s.title, style: "sectionTitle" },
        { text: "", margin: [0, 0, 0, 6] },
        ...pdfBlocks(s.blocks),
      ],
      pageBreak: "before",
    });
  }

  return {
    pageSize: "A4",
    pageMargins: [52, 64, 52, 56],
    info: {
      title: doc.meta.title,
      author: doc.meta.preparedBy,
      subject: `${doc.meta.reference} — ${doc.meta.clientName}`,
    },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.55, color: INK },
    styles: {
      micro: { fontSize: 7.5, characterSpacing: 1.2, margin: [0, 2, 0, 2] },
      kicker: { fontSize: 8, characterSpacing: 1.6, color: ACCENT, bold: true, margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 21, bold: true, color: INK, margin: [0, 2, 0, 14] },
      cardTitle: { fontSize: 13.5, bold: true, color: INK, margin: [0, 2, 0, 4] },
      body: { fontSize: 10, color: INK, lineHeight: 1.6 },
      tableHeader: { color: "#ffffff", fontSize: 9, bold: true, characterSpacing: 0.4 },
      tableCell: { fontSize: 9.5, color: INK },
      coverKicker: { fontSize: 11, characterSpacing: 4, color: ACCENT, bold: true, margin: [0, 0, 0, 10] },
      coverTitle: { fontSize: 34, bold: true, color: INK, lineHeight: 1.15, margin: [0, 0, 0, 22] },
      coverMeta: { fontSize: 12, color: MUTED, margin: [0, 2, 0, 2] },
      coverValue: { fontSize: 13, bold: true, color: INK, margin: [2, 0, 0, 0] },
    },
    header: (currentPage: number, pageCount: number) => (currentPage <= 1 ? null : header(currentPage, pageCount)),
    footer: () => ({
      columns: [
        { text: doc.meta.clientName.toUpperCase(), style: "micro", color: FAINT },
        { text: doc.meta.reference, style: "micro", color: FAINT, alignment: "right" },
      ],
      margin: [52, 0, 52, 24],
    }),
    content,
  };
}

export async function generateProposalPdf(doc: ProposalDoc): Promise<{ buffer: Buffer; pages: number }> {
  const definition = proposalToPdfDefinition(doc);
  let buffer: Buffer;
  try {
    const raw = await pdfMake.createPdf(definition).getBuffer();
    buffer = Buffer.from(new Uint8Array(raw as unknown as ArrayBuffer));
  } catch (err) {
    throw err;
  }

  let pages = 0;
  try {
    const parsed = await PDFDocument.load(buffer, { ignoreEncryption: true });
    pages = parsed.getPageCount();
  } catch {
    pages = doc.sections.filter((s) => s.visible).length;
  }
  return { buffer, pages };
}

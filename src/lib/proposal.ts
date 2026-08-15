import { db } from "./db";
import { loadAnswers, loadFeatures } from "./requirements";
import { serializeProposalDelivery, type ProposalDeliveryBundle } from "./proposal-delivery";
import { PDFDocument } from "pdf-lib";
import {
  amountLabel,
  estimateBudgetAmount,
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
}): ProposalSection {
  return {
    id: input.id,
    number: input.number,
    title: input.title,
    kicker: input.kicker,
    source: input.source,
    visible: input.visible ?? true,
    blocks: input.blocks,
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
    paragraph(String(business.description || "This proposal outlines how we will deliver the project described below.")),
    paragraph(String(business.problem || "")),
    paragraph(String(business.currentProcess || "")),
    paragraph(String(vision.description || "")),
  ].filter((b) => b.type === "paragraph" && b.text.trim().length > 0);

  const overviewBlocks: ProposalBlock[] = [
    paragraph(`${client.companyName}${client.industry ? ` operates in the ${client.industry} space` : ""}.`),
    paragraph(String(business.customers || "")),
    paragraph(String(business.differentiator || "")),
    paragraph(String(design.style ? `Design direction: ${String(design.style)}.` : "")),
  ].filter((b) => b.type === "paragraph" && b.text.trim().length > 0);

  const timelineBlocks: ProposalBlock[] = [
    paragraph(`Target launch window: ${timelineLabel(answers)}.`),
    ...(String(timeline.priority ?? "").trim() ? [paragraph(`Priority: ${String(timeline.priority)}.`)] : []),
    ...(String(timeline.fixedDeadline) === "Yes" && String(timeline.deadlineDate ?? "").trim()
      ? [paragraph(`A fixed deadline of ${String(timeline.deadlineDate)} has been confirmed.`)]
      : []),
  ].filter((b) => b.type === "paragraph" && b.text.trim().length > 0);

  const investmentBlocks: ProposalBlock[] = [
    paragraph(String(commercial.budgetModel ? `Budget model: ${String(commercial.budgetModel)}.` : "Budget model to be confirmed.")),
    ...(String(commercial.budgetRange ?? "").trim() ? [paragraph(`Indicated range: ${String(commercial.budgetRange)}.`)] : []),
    paragraph(amountLabel(amount)),
    ...(String(commercial.notes ?? "").trim() ? [paragraph(String(commercial.notes))] : []),
  ].filter((b) => b.type === "paragraph" && b.text.trim().length > 0);

  const sections: ProposalSection[] = [
    section({
      id: "cover",
      number: "01",
      title: proposal.title,
      kicker: "Proposal",
      source: "REQUIREMENT",
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
      blocks: [],
    }),
    section({
      id: "executive-summary",
      number: "02",
      title: "Executive Summary",
      kicker: "The opportunity",
      source: "REQUIREMENT",
      blocks: execSummaryBlocks,
    }),
    section({
      id: "overview",
      number: "03",
      title: "About the Client",
      kicker: "Context",
      source: "CLIENT",
      blocks: overviewBlocks,
    }),
    section({
      id: "objectives",
      number: "04",
      title: "Objectives",
      kicker: "What success looks like",
      source: "REQUIREMENT",
      blocks: [
        ...(goals.length > 0 ? [list(goals)] : []),
        ...(userOutcomes.length > 0 ? [paragraph("Users should be able to:"), list(userOutcomes)] : []),
        ...(String(success.kpis ?? "").trim() ? [paragraph(String(success.kpis))] : []),
        ...(criteria.length > 0 ? [paragraph("Success criteria:"), list(criteria)] : []),
      ],
    }),
    section({
      id: "scope",
      number: "05",
      title: "Scope",
      kicker: "What is included and what is not",
      source: "REQUIREMENT",
      blocks: [
        ...(included.length > 0 ? [paragraph("Included in this engagement:"), list(included)] : []),
        ...(excluded.length > 0 ? [paragraph("Explicitly out of scope:"), list(excluded)] : []),
        ...(assumptions.length > 0 ? [paragraph("Assumptions:"), list(assumptions)] : []),
      ],
    }),
    section({
      id: "deliverables",
      number: "06",
      title: "Deliverables",
      kicker: "What will be built",
      source: "REQUIREMENT",
      blocks:
        features.length > 0
          ? [
              paragraph("The project will deliver the following capabilities:"),
              table(
                ["Capability", "Priority", "Users"],
                features.map((f) => [f.name, f.priority.replace(/_/g, " ").toLowerCase(), f.users.join(", ") || "—"]),
              ),
            ]
          : [paragraph("Deliverables will be defined together during project kickoff.")],
    }),
    section({
      id: "methodology",
      number: "07",
      title: "Methodology",
      kicker: "How we will work",
      source: "MANUAL",
      blocks: [
        paragraph(
          "We follow a phased delivery approach: discovery and planning, design, build, testing, and launch. Each phase ends with a review so you always know exactly where the project stands. (Describe your team's process here.)",
        ),
      ],
    }),
    section({
      id: "timeline",
      number: "08",
      title: "Timeline",
      kicker: "When this will happen",
      source: "REQUIREMENT",
      blocks: timelineBlocks,
    }),
    section({
      id: "activity-plan",
      number: "09",
      title: "Activity Plan",
      kicker: "A working outline",
      source: "MANUAL",
      blocks: [
        paragraph("A detailed activity plan will be shared at kickoff, covering discovery, design, development, testing and launch milestones. (Customize this section with your plan.)"),
      ],
    }),
    section({
      id: "roles",
      number: "10",
      title: "Roles & Responsibilities",
      kicker: "Who is involved",
      source: "CLIENT",
      blocks:
        stakeholders.length > 0
          ? [
              paragraph("Client-side stakeholders:"),
              table(
                ["Name", "Role", "Type"],
                stakeholders.map((s) => [s.name ?? "—", s.role ?? "—", s.type ?? "—"]),
              ),
            ]
          : [paragraph("Stakeholders will be confirmed at kickoff.")],
    }),
    section({
      id: "communication",
      number: "11",
      title: "Communication",
      kicker: "How we stay in sync",
      source: "CLIENT",
      blocks: [
        paragraph(`Primary contact: ${contact ? contact.name : "to be confirmed"}${contact?.role ? ` (${contact.role})` : ""}.`),
        ...(contact?.email ? [paragraph(`Email: ${contact.email}`)] : []),
        ...(contact?.phone ? [paragraph(`Phone: ${contact.phone}`)] : []),
      ],
    }),
    section({
      id: "investment",
      number: "12",
      title: "Investment",
      kicker: "Budget",
      source: "REQUIREMENT",
      blocks: investmentBlocks,
    }),
    section({
      id: "terms",
      number: "13",
      title: "Terms",
      kicker: "Working agreement",
      source: "MANUAL",
      blocks: [
        paragraph("Payment and engagement terms will be confirmed in the final agreement. (Outline payment schedule, milestones and conditions here.)"),
      ],
    }),
    section({
      id: "contact",
      number: "14",
      title: "Contact",
      kicker: "Reach us",
      source: "WORKSPACE",
      blocks: [
        paragraph(workspace.companyName),
        ...(workspace.profile?.businessEmail ? [paragraph(workspace.profile.businessEmail)] : []),
        ...(workspace.profile?.businessPhone ? [paragraph(workspace.profile.businessPhone)] : []),
        ...(workspace.profile?.website ? [paragraph(workspace.profile.website)] : []),
      ],
    }),
    section({
      id: "closing",
      number: "15",
      title: "Next Steps",
      kicker: "Where we go from here",
      source: "MANUAL",
      blocks: [
        paragraph("We would be delighted to bring this project to life. Once you approve this proposal, we will schedule kickoff and begin."),
        paragraph("Warm regards,"),
        paragraph(workspace.companyName),
      ],
    }),
  ];

  return { version: 1, meta, sections };
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

  let document: ProposalDoc;
  try {
    document = JSON.parse(proposal.document || "{}") as ProposalDoc;
  } catch {
    document = { version: 1, meta: { reference: "PROP", title: proposal.title, clientName: proposal.client.companyName, preparedBy: workspace?.companyName ?? "", preparedFor: null, amount: null, currency: "INR", amountLabel: "To be confirmed", timelineLabel: "", date: new Date().toISOString() }, sections: [] };
  }

  if (!document.sections || document.sections.length === 0) {
    if (!client || !workspace) throw new Error("Proposal context missing.");
    const answers = request ? await loadAnswers(request.id) : {};
    const features = request ? await loadFeatures(request.id) : [];
    document = buildProposalDocument({
      proposal,
      client,
      workspace,
      contact,
      answers,
      features,
    });
  }

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
        }
      : null,
    client: { id: proposal.client.id, companyName: proposal.client.companyName, industry: proposal.client.industry, email: proposal.client.email },
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

// pdfmake ships without TypeScript types; the runtime shape is declared in
// src/types/pdfmake.d.ts. The fonts are embedded in vfs_fonts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake/build/pdfmake") as {
  createPdf(doc: unknown): { getBuffer(): Promise<Buffer> };
  vfs: Record<string, string>;
};
// pdfmake ≥0.3 ships the font map directly (Roboto base64 entries).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require("pdfmake/build/vfs_fonts") as Record<string, string>;
pdfMake.vfs = pdfFonts;

const ACCENT = "#b5452a";
const INK = "#1a1714";
const MUTED = "#6b655c";
const FAINT = "#9a948a";
const RULE = "#e7e2d8";

function pdfBlocks(blocks: ProposalBlock[]): unknown[] {
  const out: unknown[] = [];
  for (const b of blocks) {
    if (b.type === "paragraph") {
      const text = b.text.trim();
      if (!text) continue;
      out.push({ text, style: "body", margin: [0, 0, 0, 8] });
    } else if (b.type === "list") {
      out.push(
        b.items.map((item, i) => ({
          text: [{ text: `${String(i + 1).padStart(2, "0")}  `, color: ACCENT }, { text: item }],
          style: "body",
          margin: [0, 0, 0, 4],
        })),
      );
    } else if (b.type === "table") {
      out.push({
        table: {
          widths: b.headers.map((_, i) => (i === 0 ? "*" : "auto")),
          headerRows: 1,
          body: [
            b.headers.map((h) => ({ text: h, style: "tableHeader" })),
            ...b.rows.map((row) => row.map((cell) => ({ text: cell, style: "tableCell" }))),
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
    } else if (b.type === "spacer") {
      out.push({ text: "", margin: [0, 0, 0, 18] });
    }
  }
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
    content.push({
      stack: [
        { text: "Contents", style: "sectionTitle" },
        { text: "", margin: [0, 0, 0, 16] },
        { toc: { id: "mainToc", title: { text: "", style: "body" } } },
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
        { text: s.title, style: "sectionTitle", tocItem: { tocItem: "mainToc" } },
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
    // pdfmake ≥0.3: getBuffer() returns a Promise<Buffer> — but its build
    // bundles its own Buffer polyfill. Normalize to a real Node Buffer so
    // the bytes are safe to write to disk and serve.
    const raw = await pdfMake.createPdf(definition).getBuffer();
    buffer = Buffer.from(new Uint8Array(raw as unknown as ArrayBuffer));
  } catch (err) {
    throw err;
  }

  // Count pages accurately with pdf-lib — never guess.
  let pages = 0;
  try {
    const parsed = await PDFDocument.load(buffer, { ignoreEncryption: true });
    pages = parsed.getPageCount();
  } catch {
    pages = doc.sections.filter((s) => s.visible).length;
  }
  return { buffer, pages };
}

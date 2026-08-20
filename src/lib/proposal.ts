import { db } from "./db";
import { loadAnswers, loadFeatures } from "./requirements";
import { serializeProposalDelivery, type ProposalDeliveryBundle } from "./proposal-delivery";
import { PDFDocument } from "pdf-lib";
import {
  normalizeDoc,
  type ProposalDoc,
  type ProposalBlock,
} from "./proposal-doc";
import { buildPremiumProposalDocument } from "./proposal-engine";
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


/** Build a premium, client-ready proposal document from structured intake data. */
export function buildProposalDocument(ctx: BuildContext): ProposalDoc {
  return buildPremiumProposalDocument(ctx);
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
  proposal: ClientProposal & { client?: { id: string; companyName: string; industry: string | null; email: string | null; workspaceId: string } | null },
): Promise<ProposalStudioBundle> {
  const client =
    proposal.client ??
    (await db.client.findUnique({
      where: { id: proposal.clientId },
      select: { id: true, companyName: true, industry: true, email: true, workspaceId: true },
    }));

  const workspaceId = client?.workspaceId;

  const [workspace, request, contact] = await Promise.all([
    workspaceId ? db.workspace.findUnique({ where: { id: workspaceId }, include: { profile: true } }) : Promise.resolve(null),
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
        clientName: client?.companyName ?? "Client",
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
    const fullClient = await db.client.findUnique({ where: { id: proposal.clientId } });
    if (!fullClient || !workspace) throw new Error("Proposal context missing.");
    const answers = request ? await loadAnswers(request.id) : {};
    document = buildProposalDocument({
      proposal,
      client: fullClient,
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
      id: client?.id ?? proposal.clientId,
      companyName: client?.companyName ?? "Client",
      industry: client?.industry ?? null,
      email: proposal.sentTo ?? client?.email ?? contact?.email ?? null,
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
  addVirtualFileSystem?(vfs: Record<string, string>): void;
  vfs?: Record<string, string>;
  virtualfs?: { storage: Record<string, unknown> };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require("pdfmake/build/vfs_fonts") as Record<string, string>;
if (typeof pdfMake.addVirtualFileSystem === "function") {
  pdfMake.addVirtualFileSystem(pdfFonts);
}
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
    } else if (b.type === "transformation_map") {
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 4] }] : []),
          ...(b.summary ? [{ text: b.summary, style: "body", color: MUTED, margin: [0, 0, 0, 8] }] : []),
          ...b.steps.map((st) => ({
            columns: [
              {
                width: "*",
                stack: [
                  { text: `${st.stage} — CURRENT STATE`, style: "micro", bold: true, color: "#9a5b13", margin: [0, 0, 0, 2] },
                  { text: st.current, style: "body", margin: [0, 0, 0, 2] },
                  { text: `Impact: ${st.impact}`, style: "body", color: MUTED, fontSize: 9 },
                ],
                background: "#fdf3e7",
                padding: [8, 6, 8, 6],
              },
              { width: 8, text: "" },
              {
                width: "*",
                stack: [
                  { text: "TARGET PRODUCT CAPABILITY", style: "micro", bold: true, color: "#3f6e35", margin: [0, 0, 0, 2] },
                  { text: st.future, style: "body", margin: [0, 0, 0, 2] },
                  { text: `Outcome: ${st.outcome}`, style: "body", color: MUTED, fontSize: 9 },
                ],
                background: "#eef6ec",
                padding: [8, 6, 8, 6],
              },
            ],
            margin: [0, 0, 0, 6],
          })),
        ],
        margin: [0, 2, 0, 12],
      });
    } else if (b.type === "system_blueprint") {
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 4] }] : []),
          ...(b.description ? [{ text: b.description, style: "body", color: MUTED, margin: [0, 0, 0, 8] }] : []),
          ...b.nodes.map((node) => ({
            stack: [
              { text: `${node.category}: ${node.title}`, bold: true, fontSize: 9.5, color: INK, margin: [0, 0, 0, 3] },
              { text: node.items.map((it) => `• ${it}`).join("   "), style: "body", color: MUTED, fontSize: 9 },
            ],
            background: "#faf7f2",
            padding: [8, 6, 8, 6],
            borderColor: RULE,
            borderWidth: [0.6, 0.6, 0.6, 0.6],
            margin: [0, 0, 0, 6],
          })),
        ],
        margin: [0, 2, 0, 12],
      });
    } else if (b.type === "module_card") {
      push({
        stack: [
          { columns: [{ text: `${b.id || "MODULE"}: ${b.name}`, style: "cardTitle" }, { text: (b.priority || "MUST_HAVE").replace("_", " "), style: "micro", bold: true, color: ACCENT, alignment: "right" }] },
          { text: b.purpose, style: "body", margin: [0, 2, 0, 4] },
          { text: `Primary Users: ${b.primaryUsers.join(", ")}`, style: "micro", color: MUTED, margin: [0, 0, 0, 4] },
          { text: "Core Actions:", style: "micro", bold: true, color: INK },
          { text: b.userActions.map((a) => `• ${a}`).join("\n"), style: "body", color: MUTED, fontSize: 9, margin: [0, 2, 0, 4] },
          { text: `Business Value: ${b.businessValue}`, style: "body", color: "#3f6e35", fontSize: 9, bold: true },
        ],
        margin: [0, 2, 0, 10],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [10, 8, 10, 8],
      });
    } else if (b.type === "journey_flow") {
      push({
        stack: [
          { text: `USER JOURNEY — ${b.persona.toUpperCase()}`, style: "micro", bold: true, color: ACCENT },
          { text: `Primary Goal: ${b.primaryGoal}`, style: "body", bold: true, margin: [0, 2, 0, 4] },
          ...b.steps.map((st) => ({
            columns: [
              { width: 22, text: `0${st.stepNumber}`, style: "micro", bold: true, color: ACCENT },
              {
                width: "*",
                stack: [
                  { text: st.action, bold: true, fontSize: 9.5, color: INK },
                  { text: `Screen: ${st.screenExperience}`, style: "micro", color: FAINT },
                  { text: st.systemResponse, style: "body", color: MUTED, fontSize: 9, margin: [0, 1, 0, 0] },
                ],
              },
            ],
            margin: [0, 0, 0, 6],
          })),
        ],
        margin: [0, 2, 0, 12],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [10, 8, 10, 8],
      });
    } else if (b.type === "feature_matrix") {
      push({
        table: {
          widths: ["auto", "auto", "*", "auto", "auto"],
          headerRows: 1,
          body: [
            [
              { text: "ID", style: "tableHeader" },
              { text: "MODULE", style: "tableHeader" },
              { text: "FEATURE & PURPOSE", style: "tableHeader" },
              { text: "USER", style: "tableHeader" },
              { text: "RELEASE", style: "tableHeader" },
            ],
            ...b.items.map((it) => [
              { text: it.featureId, style: "tableCell", bold: true },
              { text: it.module, style: "tableCell" },
              {
                stack: [
                  { text: it.name, bold: true, fontSize: 9.5, color: INK },
                  { text: it.whatItDoes, color: MUTED, fontSize: 8.5 },
                ],
              },
              { text: it.user, style: "tableCell", fontSize: 8.5 },
              { text: it.priority, style: "tableCell", bold: true, color: it.priority === "MVP" ? ACCENT : MUTED },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? ACCENT : RULE),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? ACCENT : rowIndex % 2 === 0 ? "#faf7f2" : null),
        },
        margin: [0, 4, 0, 14],
      });
    } else if (b.type === "acceptance_spec") {
      push({
        stack: [
          { columns: [{ text: `${b.id}: ${b.featureTitle}`, style: "cardTitle" }, { text: "GIVEN-WHEN-THEN", style: "micro", bold: true, color: ACCENT, alignment: "right" }] },
          { text: [{ text: "GIVEN ", bold: true, color: ACCENT }, { text: b.given }], style: "body", fontSize: 9, margin: [0, 2, 0, 2] },
          { text: [{ text: "WHEN ", bold: true, color: ACCENT }, { text: b.when }], style: "body", fontSize: 9, margin: [0, 0, 0, 2] },
          { text: "THEN:", bold: true, style: "body", color: ACCENT, fontSize: 9 },
          { text: b.then.map((t) => `• ${t}`).join("\n"), style: "body", color: MUTED, fontSize: 8.5, margin: [0, 1, 0, 4] },
          ...(b.failureBehavior ? [{ text: `Failure Behavior: ${b.failureBehavior}`, style: "micro", color: "#9a5b13" }] : []),
        ],
        margin: [0, 2, 0, 10],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [10, 8, 10, 8],
      });
    } else if (b.type === "domain_entity_map") {
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 4] }] : []),
          ...b.entities.map((e) => ({
            stack: [
              { text: e.name, bold: true, fontSize: 10, color: INK },
              { text: e.description, style: "body", color: MUTED, fontSize: 8.5 },
              { text: `Attributes: ${e.keyAttributes.join(", ")}`, style: "micro", color: FAINT },
              { text: `Relations: ${e.relationships.join(" | ")}`, style: "micro", color: ACCENT },
            ],
            background: "#faf7f2",
            padding: [6, 5, 6, 5],
            margin: [0, 0, 0, 4],
          })),
        ],
        margin: [0, 2, 0, 10],
      });
    } else if (b.type === "integration_spec") {
      push({
        stack: [
          { columns: [{ text: b.serviceName, style: "cardTitle" }, { text: b.category, style: "micro", color: ACCENT, alignment: "right" }] },
          { text: b.purpose, style: "body", fontSize: 9, margin: [0, 1, 0, 3] },
          cardTable([
            { label: "Data Exchanged", value: b.dataExchanged },
            { label: "Trigger", value: b.trigger },
            { label: "Direction", value: b.direction },
            { label: "Failure Protocol", value: b.failureBehavior },
          ]),
        ],
        margin: [0, 2, 0, 10],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [10, 8, 10, 8],
      });
    } else if (b.type === "screen_card") {
      push({
        stack: [
          { columns: [{ text: `${b.screenId || "SCR"}: ${b.name}`, style: "cardTitle" }, { text: `User: ${b.primaryUser}`, style: "micro", color: FAINT, alignment: "right" }] },
          { text: b.purpose, style: "body", fontSize: 9, margin: [0, 1, 0, 2] },
          { text: `Key Info: ${b.keyInformation.join(" · ")}`, style: "micro", color: MUTED },
          { text: `Actions: ${b.primaryActions.join(" · ")}`, style: "micro", color: ACCENT },
        ],
        margin: [0, 2, 0, 8],
        borderColor: RULE,
        borderWidth: [0.6, 0.6, 0.6, 0.6],
        padding: [8, 6, 8, 6],
      });
    } else if (b.type === "qa_verification") {
      push({
        table: {
          widths: ["*", "auto", "*", "*"],
          headerRows: 1,
          body: [
            [
              { text: "WORKFLOW / FEATURE", style: "tableHeader" },
              { text: "TEST TYPE", style: "tableHeader" },
              { text: "EXPECTED RESULT", style: "tableHeader" },
              { text: "VERIFICATION GATE", style: "tableHeader" },
            ],
            ...b.items.map((qa) => [
              { text: qa.featureOrWorkflow, style: "tableCell", bold: true },
              { text: qa.testType, style: "tableCell", fontSize: 8 },
              { text: qa.expectedResult, style: "tableCell", fontSize: 8.5 },
              { text: qa.acceptanceVerification, style: "tableCell", fontSize: 8.5, color: "#3f6e35" },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.3),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? ACCENT : RULE),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? ACCENT : rowIndex % 2 === 0 ? "#faf7f2" : null),
        },
        margin: [0, 4, 0, 14],
      });
    } else if (b.type === "roadmap_phase") {
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 6] }] : []),
          ...b.phases.map((ph) => ({
            columns: [
              { width: 26, text: ph.phaseNumber, style: "micro", bold: true, color: ACCENT },
              {
                width: "*",
                stack: [
                  { text: ph.name, bold: true, fontSize: 10, color: INK },
                  { text: ph.focus, style: "body", fontSize: 8.5, color: MUTED, margin: [0, 1, 0, 2] },
                  { text: `Deliverables: ${ph.deliverables.join(" · ")}`, style: "micro", color: INK },
                  { text: `Gate: ${ph.verificationGate}`, style: "micro", color: "#3f6e35", bold: true },
                ],
              },
            ],
            margin: [0, 0, 0, 8],
          })),
        ],
        margin: [0, 2, 0, 12],
      });
    } else if (b.type === "security_boundary") {
      push({
        stack: [
          ...(b.title ? [{ text: b.title.toUpperCase(), style: "micro", bold: true, color: ACCENT, margin: [0, 0, 0, 4] }] : []),
          ...b.boundaries.map((sb) => ({
            columns: [
              { width: 100, text: sb.layer, bold: true, fontSize: 9, color: INK },
              { width: "*", text: `${sb.mechanism} — ${sb.threatProtection}`, style: "body", color: MUTED, fontSize: 8.5 },
            ],
            margin: [0, 0, 0, 4],
          })),
        ],
        margin: [0, 2, 0, 10],
      });
    } else if (b.type === "migration_pipeline") {
      push({
        stack: [
          { text: `LEGACY TRANSITION — ${b.systemName}`, style: "micro", bold: true, color: ACCENT },
          { text: b.scopeSummary, style: "body", fontSize: 9, margin: [0, 2, 0, 4] },
          ...b.steps.map((st) => ({
            columns: [
              { width: 70, text: st.step, bold: true, fontSize: 8.5, color: INK },
              { width: 50, text: st.treatment, bold: true, fontSize: 8, color: ACCENT },
              { width: "*", text: `${st.action} (${st.verification})`, style: "body", color: MUTED, fontSize: 8.5 },
            ],
            margin: [0, 0, 0, 3],
          })),
        ],
        margin: [0, 2, 0, 10],
        background: "#faf7f2",
        padding: [8, 6, 8, 6],
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
  if (typeof pdfMake.addVirtualFileSystem === "function" && (!pdfMake.virtualfs?.storage || !Object.keys(pdfMake.virtualfs.storage).length)) {
    pdfMake.addVirtualFileSystem(pdfFonts);
  }
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

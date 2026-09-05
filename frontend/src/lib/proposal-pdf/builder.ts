/* ────────────────────────────────────────────────────────────────────────────
   PROPOSAL PDF DESIGN SYSTEM — MASTER BUILDER
   ────────────────────────────────────────────────────────────────────────────
   Assembles the full publication-grade A4 document definition from ProposalDoc.
   Manages page pacing, chapter breaks, running headers, and running footers.
   ──────────────────────────────────────────────────────────────────────────── */

import { PDF_COLORS, PDF_PAGE_CONFIG, PDF_STYLES } from "./theme";
import {
  createSectionHeader,
  renderCoverPage,
  renderExecutivePillars,
  renderProjectAtAGlance,
  renderTransformationMatrix,
  renderBusinessContextCards,
  renderSystemBlueprint,
  renderModuleCard,
  renderJourneyFlow,
  renderRequirementsTable,
  renderAcceptanceCard,
  renderArchitectureDiagram,
  renderIntegrationCard,
  renderSecurityBoundaries,
  renderQAVerificationModel,
  renderRoadmapPhases,
  renderCommercialSchedule,
  renderOutcomeKPIs,
  renderAuthorizationPage,
  safeText,
  hr,
} from "./components";
import type {
  ProposalDoc,
  ProposalSection,
  ProposalBlock,
  TransformationMap,
  SystemBlueprint,
  ModuleCard,
  JourneyFlow,
  FeatureMatrix,
  AcceptanceSpec,
  IntegrationSpec,
  ArchitectureLayer,
  SecurityBoundary,
  QAVerification,
  RoadmapPhase,
  DigitalApproval,
} from "../proposal-doc";

/* ── Fallback block renderer for custom or unstructured blocks ────────────── */
function renderBlock(b: ProposalBlock): unknown {
  switch (b.type) {
    case "paragraph": {
      const text = (b.text || "").trim();
      if (!text) return null;
      return { text: safeText(text), style: "body", margin: [0, 0, 0, 7] };
    }
    case "heading": {
      const level = b.level ?? 2;
      const style = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const margin: [number, number, number, number] = level === 1 ? [0, 10, 0, 4] : [0, 8, 0, 3];
      return { text: safeText(b.text || ""), style, margin };
    }
    case "list": {
      return {
        stack: (b.items || []).map((item, i) => ({
          columns: [
            { width: 14, text: "·", fontSize: 10, bold: true, color: PDF_COLORS.ACCENT, margin: [0, -1, 0, 0] },
            { width: "*", text: safeText(item), style: "body" },
          ],
          margin: [0, 0, 0, 3],
        })),
        margin: [0, 2, 0, 8],
      };
    }
    case "quote": {
      return {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  { text: `"${safeText(b.text)}"`, style: "bodyLead", italics: true, color: PDF_COLORS.INK },
                  ...(b.attribution ? [{ text: `- ${safeText(b.attribution)}`, fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [0, 4, 0, 0] }] : []),
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 0 ? 3 : 0),
          vLineColor: () => PDF_COLORS.ACCENT,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 4, 0, 10],
      };
    }
    case "callout": {
      const tone = b.tone ?? "info";
      const bg = tone === "warning" ? PDF_COLORS.WARNING_BG : tone === "success" ? PDF_COLORS.SUCCESS_BG : PDF_COLORS.ACCENT_LIGHT;
      const border = tone === "warning" ? PDF_COLORS.WARNING_BORDER : tone === "success" ? PDF_COLORS.SUCCESS_BORDER : PDF_COLORS.ACCENT_BORDER;
      const fg = tone === "warning" ? PDF_COLORS.WARNING : tone === "success" ? PDF_COLORS.SUCCESS : PDF_COLORS.ACCENT;

      return {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  ...(b.title ? [{ text: safeText(b.title).toUpperCase(), fontSize: 8, bold: true, color: fg, characterSpacing: 1, margin: [0, 0, 0, 3] }] : []),
                  { text: safeText(b.text || ""), fontSize: 8.5, color: PDF_COLORS.INK_LIGHT, lineHeight: 1.4 },
                ],
                fillColor: bg,
                margin: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: (i: number) => (i === 0 ? 2.5 : 0.5),
          hLineColor: () => border,
          vLineColor: (i: number) => (i === 0 ? fg : border),
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 4, 0, 10],
      };
    }
    case "statistic": {
      return {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                columns: [
                  { width: "auto", text: safeText(b.value), fontSize: 22, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 0, 12, 0] },
                  {
                    width: "*",
                    stack: [
                      { text: safeText(b.label).toUpperCase(), style: "eyebrowMuted", margin: [0, 2, 0, 1] },
                      ...(b.detail ? [{ text: safeText(b.detail), fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED }] : []),
                    ],
                  },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => PDF_COLORS.BORDER,
          vLineColor: () => PDF_COLORS.BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 4, 0, 10],
      };
    }
    case "table": {
      const headers = b.headers || [];
      const rows = b.rows || [];
      return {
        table: {
          widths: headers.map((_, i) => (i === 0 ? "*" : "auto")),
          headerRows: 1,
          dontBreakRows: true,
          body: [
            headers.map((h) => ({ text: safeText(h), style: "tableHeader", fillColor: PDF_COLORS.INK })),
            ...rows.map((row) => row.map((cell) => ({ text: safeText(cell), style: "tableCell" }))),
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.4),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? PDF_COLORS.INK : PDF_COLORS.BORDER),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          fillColor: (i: number) => (i === 0 ? null : i % 2 === 0 ? PDF_COLORS.BG_CARD_TINT : null),
        },
        margin: [0, 4, 0, 10],
      };
    }
    case "assumption": {
      return {
        columns: [
          { width: 32, text: safeText(b.id || "ASM").toUpperCase(), fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 1, 0, 0] },
          {
            width: "*",
            stack: [
              { text: safeText(b.description || ""), fontSize: 8.5, color: PDF_COLORS.INK_LIGHT },
              ...(b.owner || b.impact
                ? [{ text: [b.owner ? `Owner: ${safeText(b.owner)}` : null, b.impact ? `Impact: ${safeText(b.impact)}` : null].filter(Boolean).join(" · "), fontSize: 7.5, color: PDF_COLORS.TEXT_FAINT, margin: [0, 1, 0, 0] }]
                : []),
            ],
          },
        ],
        margin: [0, 0, 0, 4],
      };
    }
    case "risk": {
      return {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: safeText(b.title || "Risk Item"), fontSize: 9.5, bold: true, color: PDF_COLORS.INK },
                      { text: `PROBABILITY: ${safeText(b.probability) || "LOW"} · IMPACT: ${safeText(b.impact) || "MEDIUM"}`, style: "eyebrowMuted", alignment: "right" },
                    ],
                    margin: [0, 0, 0, 2],
                  },
                  { text: safeText(b.description || ""), fontSize: 8.5, color: PDF_COLORS.INK_LIGHT, margin: [0, 0, 0, 3] },
                  ...(b.mitigation ? [{ text: `Proactive Mitigation: ${safeText(b.mitigation)}`, fontSize: 8, color: PDF_COLORS.SUCCESS }] : []),
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => PDF_COLORS.BORDER,
          vLineColor: () => PDF_COLORS.BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 6],
      };
    }
    case "screen_card": {
      return {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: `${safeText(b.screenId || "SCR")}: ${safeText(b.name)}`, fontSize: 9.5, bold: true, color: PDF_COLORS.INK },
                      { text: `Target User: ${safeText(b.primaryUser || "All Users")}`, style: "eyebrowMuted", alignment: "right" },
                    ],
                    margin: [0, 0, 0, 2],
                  },
                  { text: safeText(b.purpose), fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 0, 0, 4] },
                  {
                    columns: [
                      { width: "50%", text: [{ text: "Key Info: ", bold: true, fontSize: 7.5, color: PDF_COLORS.INK }, { text: (b.keyInformation || []).map(safeText).join(" · "), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED }] },
                      { width: "50%", text: [{ text: "Primary Actions: ", bold: true, fontSize: 7.5, color: PDF_COLORS.ACCENT }, { text: (b.primaryActions || []).map(safeText).join(" · "), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED }] },
                    ],
                  },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => PDF_COLORS.BORDER,
          vLineColor: () => PDF_COLORS.BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 6],
      };
    }
    case "spacer": {
      return { text: "", margin: [0, 0, 0, 10] };
    }
    default:
      return null;
  }
}

/* ── Section Renderer ──────────────────────────────────────────────────────── */
function renderSection(section: ProposalSection, doc: ProposalDoc): unknown[] {
  const out: unknown[] = [];
  const s = section;

  // 1. Cover
  if (s.id === "cover") {
    return [renderCoverPage(doc)];
  }

  // Section Header (Number, Kicker, Title)
  out.push(...createSectionHeader(s.number, s.kicker, s.title));

  // 2. Executive Summary (Special 4-Pillar Grid + Project at a Glance)
  if (s.id === "executive-summary") {
    // Extract strategic pillars
    const vision = s.blocks.find((b) => b.type === "paragraph")?.text || `A purpose-built digital platform engineered for ${doc.meta.clientName}.`;
    out.push({
      text: `"Building a connected operating system for ${doc.meta.clientName}'s business."`,
      style: "bodyLead",
      bold: true,
      color: PDF_COLORS.INK,
      margin: [0, 0, 0, 10],
    });

    out.push(
      renderExecutivePillars({
        challenge: "Operational processes currently rely on fragmented tools and manual coordination, introducing latency, communication friction, and limited visibility.",
        opportunity: "Consolidate clients, requirements, proposals, projects, tasks, documents, payments, and analytics into one connected digital operations platform.",
        solution: "A unified, structured Business OS platform combining authenticated workspaces, automated domain workflows, and centralized governance.",
        outcome: "Eliminate manual operational bottlenecks, enforce data integrity with immutable audit trails, and establish scalable technical infrastructure.",
      })
    );

    // Project at a Glance metric blocks
    out.push({ text: "PROJECT PARAMETERS AT A GLANCE", style: "eyebrow", margin: [0, 10, 0, 4] });
    out.push(
      renderProjectAtAGlance({
        projectType: "Enterprise Web App",
        priority: "High",
        timeline: doc.meta.timelineLabel || "1–3 months",
        budget: doc.meta.amountLabel || "Fixed Milestone",
        usersCount: "5 Roles",
        capabilitiesCount: "11 Modules",
        integrationsCount: "Confirmed",
        gatesCount: "6 Quality Gates",
      })
    );

    // Remaining blocks in executive summary
    s.blocks.forEach((b) => {
      if (b.type === "statistic") out.push(renderBlock(b));
    });

    return out;
  }

  // 3. Transformation Section (Current State vs Target State)
  if (s.id === "transformation") {
    const mapBlock = s.blocks.find((b) => b.type === "transformation_map") as ({ type: "transformation_map" } & TransformationMap) | undefined;
    if (mapBlock) {
      out.push(renderTransformationMatrix(mapBlock));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "transformation_map") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 4. Business Context & Strategic Narrative
  if (s.id === "business-context") {
    out.push(renderBusinessContextCards(s.blocks));
    return out;
  }

  // 5. Product Blueprint Section
  if (s.id === "product-blueprint") {
    const bpBlock = s.blocks.find((b) => b.type === "system_blueprint") as ({ type: "system_blueprint" } & SystemBlueprint) | undefined;
    if (bpBlock) {
      out.push(renderSystemBlueprint(bpBlock));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "system_blueprint") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 6. Core Product Modules (Paced 2 modules per page with zero breaking)
  if (s.id === "core-modules") {
    const modCards = s.blocks.filter((b) => b.type === "module_card") as unknown as ModuleCard[];
    const otherBlocks = s.blocks.filter((b) => b.type !== "module_card");

    otherBlocks.forEach((b) => {
      const r = renderBlock(b);
      if (r) out.push(r);
    });

    modCards.forEach((m, idx) => {
      out.push(renderModuleCard(m));
      if ((idx + 1) % 2 === 0 && idx < modCards.length - 1) {
        out.push({ text: "", pageBreak: "after" });
      }
    });
    return out;
  }

  // 7. User Journeys
  if (s.id === "user-journeys") {
    s.blocks.forEach((b) => {
      if (b.type === "journey_flow") {
        out.push(renderJourneyFlow(b as unknown as JourneyFlow));
      } else {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 8. Requirements & Traceability
  if (s.id === "feature-map" || s.id === "requirements-traceability") {
    const matrixBlock = s.blocks.find((b) => b.type === "feature_matrix") as ({ type: "feature_matrix" } & FeatureMatrix) | undefined;
    if (matrixBlock && matrixBlock.items) {
      out.push(renderRequirementsTable(matrixBlock.items));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "feature_matrix") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 9. Acceptance Criteria (Paced 2 acceptance cards per page)
  if (s.id === "acceptance-criteria") {
    const acCards = s.blocks.filter((b) => b.type === "acceptance_spec") as unknown as AcceptanceSpec[];
    const otherBlocks = s.blocks.filter((b) => b.type !== "acceptance_spec");

    otherBlocks.forEach((b) => {
      const r = renderBlock(b);
      if (r) out.push(r);
    });

    acCards.forEach((ac, idx) => {
      out.push(renderAcceptanceCard(ac));
      if ((idx + 1) % 2 === 0 && idx < acCards.length - 1) {
        out.push({ text: "", pageBreak: "after" });
      }
    });
    return out;
  }

  // 9. Technical Architecture
  if (s.id === "technical-architecture") {
    const archBlock = s.blocks.find((b) => b.type === "architecture") as { layers: ArchitectureLayer[] } | undefined;
    if (archBlock) {
      out.push(renderArchitectureDiagram(archBlock.layers));
    }
    const secBlock = s.blocks.find((b) => b.type === "security_boundary") as ({ type: "security_boundary" } & SecurityBoundary) | undefined;
    if (secBlock) {
      out.push({ text: "SECURITY & GOVERNANCE BOUNDARIES", style: "eyebrow", margin: [0, 6, 0, 4] });
      out.push(renderSecurityBoundaries(secBlock));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "architecture" && b.type !== "security_boundary") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 10. Integrations
  if (s.id === "integrations") {
    s.blocks.forEach((b) => {
      if (b.type === "integration_spec") {
        out.push(renderIntegrationCard(b as unknown as IntegrationSpec));
      } else {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 11. Deliverables & QA
  if (s.id === "deliverables-qa") {
    const qaBlock = s.blocks.find((b) => b.type === "qa_verification") as ({ type: "qa_verification" } & QAVerification) | undefined;
    if (qaBlock) {
      out.push(renderQAVerificationModel(qaBlock));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "qa_verification") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 12. Delivery Roadmap
  if (s.id === "delivery-roadmap") {
    const rmBlock = s.blocks.find((b) => b.type === "roadmap_phase") as ({ type: "roadmap_phase" } & RoadmapPhase) | undefined;
    if (rmBlock) {
      out.push(renderRoadmapPhases(rmBlock));
    }
    s.blocks.forEach((b) => {
      if (b.type !== "roadmap_phase") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 13. Commercial Terms
  if (s.id === "commercial-terms") {
    out.push(renderCommercialSchedule(doc));
    s.blocks.forEach((b) => {
      if (b.type !== "pricing_table") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // 14. Success & Risks
  if (s.id === "success-and-risks") {
    out.push(renderOutcomeKPIs(doc));
    s.blocks.forEach((b) => {
      const r = renderBlock(b);
      if (r) out.push(r);
    });
    return out;
  }

  // 15. Authorization & Next Steps
  if (s.id === "authorization") {
    const approvalBlock = s.blocks.find((b) => b.type === "approval") as ({ type: "approval" } & DigitalApproval) | undefined;
    out.push(
      renderAuthorizationPage(doc, {
        clientName: doc.meta.clientName,
        projectName: doc.meta.title,
        version: doc.version,
        approvedScope: approvalBlock?.approvedScope || "Full Committed Scope Across 11 Modules",
        authorizedPerson: approvalBlock?.authorizedPerson || doc.meta.preparedFor || "Authorized Client Executive",
        status: "READY_FOR_SIGNATURE",
      })
    );
    s.blocks.forEach((b) => {
      if (b.type !== "approval") {
        const r = renderBlock(b);
        if (r) out.push(r);
      }
    });
    return out;
  }

  // General Section Blocks
  s.blocks.forEach((b) => {
    const r = renderBlock(b);
    if (r) out.push(r);
  });

  return out;
}

/* ── Build Full Document Definition ────────────────────────────────────────── */
export function buildProposalPdfDefinition(doc: ProposalDoc): unknown {
  const visible = doc.sections.filter((s) => s.visible !== false);
  const content: unknown[] = [];

  for (let i = 0; i < visible.length; i++) {
    const section = visible[i];
    const sectionElements = renderSection(section, doc);

    content.push({
      stack: sectionElements,
      pageBreak: i > 0 ? "before" : undefined,
    });
  }

  return {
    pageSize: PDF_PAGE_CONFIG.size,
    pageMargins: PDF_PAGE_CONFIG.margins,
    info: {
      title: doc.meta.title,
      author: doc.meta.preparedBy,
      subject: `${doc.meta.reference} — ${doc.meta.clientName}`,
      creator: "Business OS Enterprise Proposal Studio",
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.55,
      color: PDF_COLORS.INK_LIGHT,
    },
    styles: PDF_STYLES,

    // Header: only shown on page 2 onwards
    header: (currentPage: number, pageCount: number) => {
      if (currentPage <= 1) return null;
      return {
        columns: [
          { text: "BUSINESS OS", fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, characterSpacing: 1 },
          { text: `·  ${doc.meta.clientName.toUpperCase()}`, fontSize: 7.5, color: PDF_COLORS.TEXT_FAINT, characterSpacing: 0.8 },
          { text: `PROP REF: ${doc.meta.reference}`, fontSize: 7.5, color: PDF_COLORS.TEXT_FAINT, alignment: "right", characterSpacing: 0.8 },
        ],
        margin: [46, 22, 46, 0],
      };
    },

    // Footer: only shown on page 2 onwards
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage <= 1) return null;
      return {
        columns: [
          { text: "STRICTLY CONFIDENTIAL", fontSize: 7.5, bold: true, color: PDF_COLORS.TEXT_FAINT, characterSpacing: 0.8 },
          { text: `${doc.meta.title}`, fontSize: 7.5, color: PDF_COLORS.TEXT_FAINT, alignment: "center" },
          { text: `PAGE ${currentPage} OF ${pageCount}`, fontSize: 7.5, bold: true, color: PDF_COLORS.INK, alignment: "right", characterSpacing: 0.5 },
        ],
        margin: [46, 0, 46, 20],
      };
    },

    content,
  };
}

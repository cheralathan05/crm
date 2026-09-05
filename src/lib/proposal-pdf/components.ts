/* ────────────────────────────────────────────────────────────────────────────
   PROPOSAL PDF DESIGN SYSTEM — COMPONENT LIBRARY
   ────────────────────────────────────────────────────────────────────────────
   Publication-grade consulting + technology components rendered in pdfmake.
   Implements vector diagrams, metric cards, strategic transformation flows,
   role matrices, security layers, quality gates, and structured specs.
   ──────────────────────────────────────────────────────────────────────────── */

import { PDF_COLORS, PDF_PAGE_CONFIG } from "./theme";
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
  DomainEntity,
  IntegrationSpec,
  ArchitectureLayer,
  SecurityBoundary,
  QAVerification,
  RoadmapPhase,
  MigrationPipeline,
  DigitalApproval,
} from "../proposal-doc";

/* ── Helper: Horizontal rule ──────────────────────────────────────────────── */
export function hr(color: string = PDF_COLORS.BORDER, thickness = 0.5, margin: [number, number, number, number] = [0, 8, 0, 12]): unknown {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: PDF_PAGE_CONFIG.usableWidth,
        y2: 0,
        lineWidth: thickness,
        lineColor: color,
      },
    ],
    margin,
  };
}

/* ── Helper: Accent bar divider ────────────────────────────────────────────── */
export function accentBar(width = 36, height = 3, margin: [number, number, number, number] = [0, 0, 0, 10]): unknown {
  return {
    canvas: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: width,
        h: height,
        color: PDF_COLORS.ACCENT,
      },
    ],
    margin,
  };
}

/* ── Safe Text Sanitizer for Font Fidelity ────────────────────────────────── */
export function safeText(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/[\u2192\u2794\u279C\u21D2]/g, " -> ")
    .replace(/[\u2190\u21D0]/g, " <- ")
    .replace(/[\u2194\u21D4]/g, " <-> ")
    .replace(/[\u2713\u2714\u2611\u2705]/g, "[OK]")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, "·");
}

/* ── Native Vector Canvas Arrow (Never Missing from Fonts) ───────────────── */
export function vectorArrow(w = 16, h = 8, color = PDF_COLORS.ACCENT, topMargin = 12): unknown {
  return {
    canvas: [
      { type: "line", x1: 0, y1: h / 2, x2: w, y2: h / 2, lineWidth: 1.5, lineColor: color },
      { type: "polyline", points: [{ x: Math.max(0, w - 4), y: 0 }, { x: w, y: h / 2 }, { x: Math.max(0, w - 4), y: h }], lineWidth: 1.5, lineColor: color },
    ],
    margin: [0, topMargin, 0, 0],
    alignment: "center",
  };
}

export function chunkArray<T>(arr: T[], size: number): (T | null)[][] {
  const res: (T | null)[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    const chunk: (T | null)[] = arr.slice(i, i + size);
    while (chunk.length < size) chunk.push(null);
    res.push(chunk);
  }
  return res;
}

/* ── Formats Multiline / Structured Descriptions into Sleek Consulting Layouts ── */
export function renderStructuredDescription(desc?: string): unknown {
  const sanitized = safeText(desc).trim();
  if (!sanitized) return { text: "" };

  const lines = sanitized.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Simple short description:
  if (lines.length <= 2 && !sanitized.includes("\t")) {
    return { text: sanitized, fontSize: 9.5, color: PDF_COLORS.INK_LIGHT, lineHeight: 1.45, margin: [0, 0, 0, 8] };
  }

  // TSV Key-Value pairs (e.g. Widget \t Purpose, Total Clients \t Live count):
  const hasTabs = lines.some((l) => l.includes("\t"));
  if (hasTabs) {
    const kvRows: [string, string][] = [];
    let currentHeading = "";
    lines.forEach((l) => {
      if (l.includes("\t")) {
        const parts = l.split("\t").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          kvRows.push([parts[0], parts.slice(1).join(" - ")]);
        } else if (parts.length === 1) {
          kvRows.push([parts[0], ""]);
        }
      } else {
        currentHeading = currentHeading ? `${currentHeading} · ${l}` : l;
      }
    });

    if (kvRows.length > 0) {
      return {
        stack: [
          ...(currentHeading ? [{ text: currentHeading.toUpperCase(), fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 0, 0, 4] }] : []),
          {
            table: {
              widths: ["32%", "68%"],
              dontBreakRows: true,
              body: kvRows.map(([k, v], rIdx) => [
                { text: k, fontSize: 8.5, bold: true, color: PDF_COLORS.INK, fillColor: rIdx % 2 === 0 ? "#f8fafc" : "#ffffff", margin: [6, 3, 6, 3] },
                { text: v || "-", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, fillColor: rIdx % 2 === 0 ? "#f8fafc" : "#ffffff", margin: [6, 3, 6, 3] },
              ]),
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => PDF_COLORS.BORDER_LIGHT,
              vLineColor: () => PDF_COLORS.BORDER_LIGHT,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
            margin: [0, 2, 0, 8],
          },
        ],
      };
    }
  }

  // Multi-item lists (e.g. Search Should Find -> Client, Company, Contact...):
  if (lines.length > 3) {
    const title = lines[0];
    const items = lines.slice(1);
    const isShortItems = items.every((it) => it.length < 35);
    if (isShortItems) {
      return {
        stack: [
          { text: title, fontSize: 8.5, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 4] },
          {
            table: {
              widths: ["33%", "33%", "34%"],
              dontBreakRows: true,
              body: chunkArray(items, 3).map((chunk) => [
                { text: chunk[0] ? `· ${chunk[0]}` : "", fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [4, 1.5, 4, 1.5] },
                { text: chunk[1] ? `· ${chunk[1]}` : "", fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [4, 1.5, 4, 1.5] },
                { text: chunk[2] ? `· ${chunk[2]}` : "", fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [4, 1.5, 4, 1.5] },
              ]),
            },
            layout: "noBorders",
            margin: [0, 0, 0, 6],
          },
        ],
      };
    }
  }

  // General multiline text:
  return {
    stack: lines.map((l) => ({ text: l, fontSize: 8.5, color: PDF_COLORS.INK_LIGHT, margin: [0, 1, 0, 1] })),
    margin: [0, 0, 0, 8],
  };
}

/* ── Formats Table Cell Content into Compact, Readable Information ────────── */
export function formatTableDescription(desc?: string): unknown {
  const safe = safeText(desc).trim();
  if (!safe) return { text: "" };
  const lines = safe.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 2 && !safe.includes("\t")) {
    return { text: safe, fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 0] };
  }
  if (safe.includes("\t")) {
    const compactPairs = lines
      .filter((l) => l.includes("\t"))
      .map((l) => {
        const [k, ...v] = l.split("\t").map((p) => p.trim()).filter(Boolean);
        return `${k}: ${v.join(" ")}`;
      });
    return { text: compactPairs.join(" · "), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 0], lineHeight: 1.3 };
  }
  if (lines.length > 3) {
    const head = lines[0];
    const items = lines.slice(1).join(" · ");
    return {
      text: [
        { text: `${head}: `, bold: true, fontSize: 7.5, color: PDF_COLORS.INK },
        { text: items, fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED },
      ],
      margin: [0, 1, 0, 0],
      lineHeight: 1.3,
    };
  }
  return { text: lines.join(" · "), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 0], lineHeight: 1.3 };
}

/* ── Helper: Section Eyebrow Header ────────────────────────────────────────── */
export function createSectionHeader(number: string, kicker: string, title: string, lead?: string): unknown[] {
  return [
    {
      columns: [
        {
          width: "auto",
          stack: [
            { text: number.padStart(2, "0"), fontSize: 24, bold: true, color: PDF_COLORS.ACCENT, lineHeight: 1 },
          ],
          margin: [0, 0, 14, 0],
        },
        {
          width: "*",
          stack: [
            { text: kicker.toUpperCase(), style: "eyebrow", margin: [0, 2, 0, 2] },
            { text: title, style: "sectionTitle" },
            ...(lead ? [{ text: lead, style: "bodyLead", margin: [0, 4, 0, 0] }] : []),
          ],
        },
      ],
      margin: [0, 0, 0, 14],
    },
    hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 14]),
  ];
}

/* ── 00. COVER PAGE ─────────────────────────────────────────────────────────── */
export function renderCoverPage(doc: ProposalDoc): unknown {
  const date = new Date(doc.meta.date);
  const dateStr = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return {
    stack: [
      // Top Rail — Business OS Brand Mark & Document Classification
      {
        columns: [
          {
            width: "auto",
            table: {
              widths: ["auto"],
              body: [
                [
                  {
                    text: "BUSINESS OS",
                    fontSize: 8.5,
                    bold: true,
                    color: "#ffffff",
                    characterSpacing: 1.8,
                    fillColor: PDF_COLORS.INK,
                    margin: [6, 3, 6, 3],
                  },
                ],
              ],
            },
            layout: "noBorders",
          },
          {
            width: "*",
            text: "ENTERPRISE SPECIFICATION & PROPOSAL",
            style: "eyebrowMuted",
            alignment: "right",
            margin: [0, 5, 0, 0],
          },
        ],
      },

      hr(PDF_COLORS.BORDER, 0.6, [0, 16, 0, 36]),

      // Main Project Identity Block
      { text: "TECHNOLOGY ENGAGEMENT PROPOSAL", style: "coverKicker", margin: [0, 0, 0, 12] },
      { text: doc.meta.title, style: "coverDisplay", margin: [0, 0, 0, 10] },
      {
        text: `A comprehensive operational architecture, system blueprint, and milestone execution plan engineered for ${doc.meta.clientName}.`,
        style: "coverSubtitle",
        margin: [0, 0, 0, 28],
      },

      // Accent Geometry & Structured Rail
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: PDF_PAGE_CONFIG.usableWidth, h: 4, color: PDF_COLORS.BORDER_LIGHT },
          { type: "rect", x: 0, y: 0, w: 140, h: 4, color: PDF_COLORS.ACCENT },
        ],
        margin: [0, 0, 0, 32],
      },

      // Two-Column Metadata Matrix (Prepared For / Prepared By)
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "PREPARED EXCLUSIVELY FOR", style: "eyebrow", margin: [0, 0, 0, 4] },
              { text: doc.meta.clientName, fontSize: 13, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 2] },
              ...(doc.meta.preparedFor ? [{ text: doc.meta.preparedFor, fontSize: 9, color: PDF_COLORS.TEXT_MUTED }] : []),
              { text: "Client Enterprise Stakeholder", fontSize: 8.5, color: PDF_COLORS.TEXT_FAINT, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "PREPARED BY", style: "eyebrow", margin: [0, 0, 0, 4] },
              { text: doc.meta.preparedBy, fontSize: 13, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 2] },
              { text: "Strategy & Engineering Architecture Practice", fontSize: 9, color: PDF_COLORS.TEXT_MUTED },
              { text: "Business OS Technology Solutions", fontSize: 8.5, color: PDF_COLORS.TEXT_FAINT, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 36],
      },

      // Executive Parameters Grid (Investment, Timeline, Reference, Date)
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              {
                stack: [
                  { text: "TOTAL INVESTMENT", style: "eyebrowMuted", margin: [0, 0, 0, 4] },
                  { text: doc.meta.amountLabel || "To be confirmed", fontSize: 12, bold: true, color: PDF_COLORS.ACCENT },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [10, 8, 10, 8],
              },
              {
                stack: [
                  { text: "TARGET TIMELINE", style: "eyebrowMuted", margin: [0, 0, 0, 4] },
                  { text: doc.meta.timelineLabel || "1–3 months", fontSize: 12, bold: true, color: PDF_COLORS.INK },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [10, 8, 10, 8],
              },
              {
                stack: [
                  { text: "DOCUMENT REF", style: "eyebrowMuted", margin: [0, 0, 0, 4] },
                  { text: doc.meta.reference, fontSize: 12, bold: true, color: PDF_COLORS.INK },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [10, 8, 10, 8],
              },
              {
                stack: [
                  { text: "VERSION & DATE", style: "eyebrowMuted", margin: [0, 0, 0, 4] },
                  { text: `v${doc.version} · ${dateStr}`, fontSize: 12, bold: true, color: PDF_COLORS.INK },
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
        margin: [0, 0, 0, 44],
      },

      // Security Seal & Confidentiality Notice
      {
        columns: [
          {
            width: "auto",
            canvas: [{ type: "rect", x: 0, y: 0, w: 2, h: 22, color: PDF_COLORS.ACCENT }],
            margin: [0, 0, 8, 0],
          },
          {
            width: "*",
            stack: [
              { text: "CONFIDENTIALITY & PROPRIETARY NOTICE", fontSize: 7.5, bold: true, color: PDF_COLORS.INK, characterSpacing: 0.8 },
              {
                text: "This document contains proprietary design specifications, architectural models, and commercial terms prepared exclusively for client evaluation. Reproduction or distribution without prior authorization is strictly prohibited.",
                fontSize: 7.5,
                color: PDF_COLORS.TEXT_FAINT,
                lineHeight: 1.35,
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
      },
    ],
    margin: [0, 16, 0, 0],
  };
}

/* ── 01. EXECUTIVE OVERVIEW (4-Pillar Strategic Grid) ──────────────────────── */
export function renderExecutivePillars(pillars: {
  challenge: string;
  opportunity: string;
  solution: string;
  outcome: string;
}): unknown {
  const card = (label: string, text: string, accentColor: string, bg: string, border: string) => ({
    width: "48%",
    stack: [
      {
        columns: [
          { width: "auto", canvas: [{ type: "rect", x: 0, y: 0, w: 3, h: 12, color: accentColor }], margin: [0, 0, 6, 0] },
          { text: label.toUpperCase(), fontSize: 8, bold: true, color: accentColor, characterSpacing: 1.2, margin: [0, 1, 0, 0] },
        ],
        margin: [0, 0, 0, 6],
      },
      { text, fontSize: 9, color: PDF_COLORS.INK_LIGHT, lineHeight: 1.45 },
    ],
    fillColor: bg,
    borderColor: border,
    border: [true, true, true, true],
    margin: [0, 0, 0, 10],
  });

  return {
    stack: [
      {
        table: {
          widths: ["49%", "2%", "49%"],
          body: [
            [
              card("The Challenge", pillars.challenge, "#9a5b13", "#fffdfa", "#fed7aa"),
              { text: "" },
              card("The Opportunity", pillars.opportunity, PDF_COLORS.ACCENT, PDF_COLORS.ACCENT_LIGHT, PDF_COLORS.ACCENT_BORDER),
            ],
            [
              card("The Proposed Solution", pillars.solution, "#1e3a8a", "#f8fafc", "#cbd5e1"),
              { text: "" },
              card("The Expected Outcome", pillars.outcome, "#15803d", "#f0fdf4", "#bbf7d0"),
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 6, 0, 14],
      },
    ],
  };
}

/* ── 02. PROJECT AT A GLANCE (Executive Metric Cards) ──────────────────────── */
export function renderProjectAtAGlance(metrics: {
  projectType: string;
  priority: string;
  timeline: string;
  budget: string;
  usersCount: string;
  capabilitiesCount: string;
  integrationsCount: string;
  gatesCount: string;
}): unknown {
  const metricCell = (label: string, value: string, sub?: string) => ({
    stack: [
      { text: label.toUpperCase(), style: "eyebrowMuted", margin: [0, 0, 0, 3] },
      { text: value, fontSize: 13, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 2] },
      ...(sub ? [{ text: sub, fontSize: 8, color: PDF_COLORS.TEXT_MUTED }] : []),
    ],
    fillColor: PDF_COLORS.BG_CARD_TINT,
    margin: [8, 6, 8, 6],
  });

  return {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        [
          metricCell("Project Type", metrics.projectType, "Web App & Ops Platform"),
          metricCell("Priority", metrics.priority, "Mission Critical"),
          metricCell("Execution Timeline", metrics.timeline, "Fixed Milestone"),
          metricCell("Committed Investment", metrics.budget, "Fixed Scope"),
        ],
        [
          metricCell("Stakeholder Roles", metrics.usersCount, "Governed RBAC"),
          metricCell("Core Capabilities", metrics.capabilitiesCount, "MVP Commitments"),
          metricCell("Active Integrations", metrics.integrationsCount, "Secure Gateways"),
          metricCell("Quality Gates", metrics.gatesCount, "Production Verification"),
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
    margin: [0, 8, 0, 16],
  };
}

/* ── 03. CURRENT STATE -> FUTURE STATE TRANSFORMATION ──────────────────────── */
export function renderTransformationMatrix(map: TransformationMap): unknown {
  const steps = map.steps || [];

  return {
    stack: [
      // Top Strategy Banner
      {
        table: {
          widths: ["47%", "6%", "47%"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  { text: "CURRENT OPERATIONAL MODEL", style: "eyebrow", color: "#9a5b13", margin: [0, 0, 0, 2] },
                  { text: "Fragmented Operations & Manual Friction", fontSize: 11, bold: true, color: PDF_COLORS.INK },
                  { text: "Spreadsheets · Isolated Emails · WhatsApp · Unaudited Documents", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                ],
                fillColor: "#fef3c7",
                margin: [8, 6, 8, 6],
              },
              vectorArrow(16, 8, PDF_COLORS.ACCENT, 14),
              {
                stack: [
                  { text: "TARGET OPERATING SYSTEM", style: "eyebrow", color: "#15803d", margin: [0, 0, 0, 2] },
                  { text: "Connected Business OS Platform", fontSize: 11, bold: true, color: PDF_COLORS.INK },
                  { text: "Automated Workflows · Unified Data Store · Real-Time Governance", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                ],
                fillColor: "#dcfce7",
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 14],
      },

      // Stage by Stage Transformation Rows
      ...steps.map((st) => ({
        table: {
          widths: ["48%", "4%", "48%"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  { text: `${safeText(st.stage)} · CURRENT CONSTRAINT`, fontSize: 8, bold: true, color: "#9a5b13", characterSpacing: 1 },
                  { text: safeText(st.current), fontSize: 9, color: PDF_COLORS.INK, margin: [0, 3, 0, 2], lineHeight: 1.35 },
                  { text: `Friction Impact: ${safeText(st.impact) || "-"}`, fontSize: 8, color: PDF_COLORS.TEXT_MUTED },
                ],
                fillColor: "#fffdfa",
                margin: [8, 6, 8, 6],
              },
              vectorArrow(14, 7, PDF_COLORS.ACCENT, 14),
              {
                stack: [
                  { text: `${safeText(st.stage)} · TARGET DIGITAL STATE`, fontSize: 8, bold: true, color: "#15803d", characterSpacing: 1 },
                  { text: safeText(st.future), fontSize: 9, bold: true, color: PDF_COLORS.INK, margin: [0, 3, 0, 2], lineHeight: 1.35 },
                  { text: `Measurable Outcome: ${safeText(st.outcome) || "-"}`, fontSize: 8, color: "#15803d" },
                ],
                fillColor: "#f0fdf4",
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
        margin: [0, 0, 0, 8],
      })),
    ],
    margin: [0, 4, 0, 14],
  };
}

/* ── 04. PRODUCT BLUEPRINT & CAPABILITY MAP ────────────────────────────────── */
export function renderSystemBlueprint(blueprint: SystemBlueprint): unknown {
  const nodes = blueprint.nodes || [];

  return {
    stack: [
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                text: "SYSTEM BLUEPRINT & TOPOLOGY MAP",
                style: "eyebrow",
                margin: [8, 6, 8, 4],
                colSpan: 2,
              },
              {},
            ],
            ...Array.from({ length: Math.ceil(nodes.length / 2) }).map((_, rIdx) => {
              const left = nodes[rIdx * 2];
              const right = nodes[rIdx * 2 + 1];

              const cell = (n?: (typeof nodes)[0]) =>
                n
                  ? {
                      stack: [
                        {
                          columns: [
                            { width: "auto", canvas: [{ type: "rect", x: 0, y: 0, w: 2, h: 10, color: PDF_COLORS.ACCENT }], margin: [0, 0, 4, 0] },
                            { text: `${n.category}: ${n.title}`.toUpperCase(), fontSize: 8, bold: true, color: PDF_COLORS.INK, characterSpacing: 0.8 },
                          ],
                          margin: [0, 0, 0, 4],
                        },
                        {
                          text: (n.items || []).map((it) => `• ${it}`).join("\n"),
                          fontSize: 8.5,
                          color: PDF_COLORS.TEXT_MUTED,
                          lineHeight: 1.35,
                        },
                      ],
                      fillColor: PDF_COLORS.BG_CARD_TINT,
                      margin: [8, 6, 8, 6],
                    }
                  : { text: "", fillColor: PDF_COLORS.BG_CARD_TINT };

              return [cell(left), cell(right)];
            }),
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
      },
    ],
    margin: [0, 4, 0, 14],
  };
}

/* ── 05. MODULE SPECIFICATION CARD ─────────────────────────────────────────── */
export function renderModuleCard(mod: ModuleCard): unknown {
  const isMustHave = mod.priority === "MUST_HAVE" || mod.priority === "HIGH";

  return {
    stack: [
      {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  // Card Header: ID, Name, Priority Badge
                  {
                    columns: [
                      {
                        width: 55,
                        text: safeText(mod.id || "MOD").toUpperCase(),
                        fontSize: 8.5,
                        bold: true,
                        color: PDF_COLORS.ACCENT,
                        margin: [0, 1, 0, 0],
                      },
                      {
                        width: "*",
                        text: safeText(mod.name),
                        fontSize: 12,
                        bold: true,
                        color: PDF_COLORS.INK,
                      },
                      {
                        width: "auto",
                        table: {
                          widths: ["auto"],
                          body: [
                            [
                              {
                                text: isMustHave ? "MUST HAVE · MVP" : "PHASE 2 ENHANCEMENT",
                                fontSize: 7.5,
                                bold: true,
                                color: isMustHave ? "#ffffff" : PDF_COLORS.TEXT_MUTED,
                                fillColor: isMustHave ? PDF_COLORS.INK : PDF_COLORS.BG_CARD_TINT,
                                margin: [6, 2, 6, 2],
                              },
                            ],
                          ],
                        },
                        layout: "noBorders",
                      },
                    ],
                    margin: [0, 0, 0, 6],
                  },

                  // Purpose & Value
                  renderStructuredDescription(mod.purpose),

                  // Users & Value Strip
                  {
                    columns: [
                      {
                        width: "50%",
                        text: [{ text: "Target Users: ", bold: true, color: PDF_COLORS.INK, fontSize: 8.5 }, { text: safeText((mod.primaryUsers || []).join(", ") || "All Stakeholders"), color: PDF_COLORS.TEXT_MUTED, fontSize: 8.5 }],
                      },
                      {
                        width: "50%",
                        text: [{ text: "Business Value: ", bold: true, color: PDF_COLORS.SUCCESS, fontSize: 8.5 }, { text: safeText(mod.businessValue || "Operational Automation"), color: PDF_COLORS.TEXT_MUTED, fontSize: 8.5 }],
                      },
                    ],
                    margin: [0, 0, 0, 8],
                  },

                  hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 8]),

                  // Two Columns: Workflow Sequence & Business Rules
                  {
                    columns: [
                      {
                        width: "50%",
                        stack: [
                          { text: "CORE WORKFLOW SEQUENCE", fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, characterSpacing: 1, margin: [0, 0, 0, 3] },
                          ...(mod.workflowSequence || []).map((step, sIdx) => ({
                            columns: [
                              { width: 14, text: `0${sIdx + 1}`, fontSize: 7.5, bold: true, color: PDF_COLORS.TEXT_FAINT, margin: [0, 1, 0, 0] },
                              { width: "*", text: safeText(step), fontSize: 8.5, color: PDF_COLORS.INK_LIGHT, lineHeight: 1.35 },
                            ],
                            margin: [0, 0, 0, 3],
                          })),
                        ],
                      },
                      {
                        width: "50%",
                        stack: [
                          { text: "BUSINESS RULES & GOVERNANCE", fontSize: 7.5, bold: true, color: PDF_COLORS.INK, characterSpacing: 1, margin: [0, 0, 0, 3] },
                          ...(mod.businessRules || []).map((rule) => ({
                            text: `• ${safeText(rule)}`,
                            fontSize: 8.5,
                            color: PDF_COLORS.TEXT_MUTED,
                            lineHeight: 1.35,
                            margin: [0, 0, 0, 3],
                          })),
                          { text: "OUTPUT ARTIFACT", fontSize: 7.5, bold: true, color: PDF_COLORS.INK, characterSpacing: 1, margin: [0, 4, 0, 1] },
                          { text: safeText(mod.output || "Structured digital records and audit events."), fontSize: 8, color: PDF_COLORS.TEXT_MUTED },
                        ],
                      },
                    ],
                  },
                ],
                fillColor: "#ffffff",
                margin: [10, 10, 10, 10],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => PDF_COLORS.BORDER,
          vLineColor: () => PDF_COLORS.BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
    ],
  };
}

/* ── 06. USER JOURNEY FLOW ─────────────────────────────────────────────────── */
export function renderJourneyFlow(flow: JourneyFlow): unknown {
  return {
    stack: [
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: `STAKEHOLDER JOURNEY — ${(flow.persona || "USER").toUpperCase()}`, style: "eyebrow" },
                      { text: "END-TO-END WORKFLOW", style: "eyebrowMuted", alignment: "right" },
                    ],
                    margin: [0, 0, 0, 4],
                  },
                  { text: `Primary Objective: ${flow.primaryGoal || ""}`, fontSize: 10, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 8] },
                  hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 8]),

                  // Connected Steps
                  {
                    columns: (flow.steps || []).map((st) => ({
                      width: `${Math.floor(100 / Math.max(1, flow.steps.length))}%`,
                      stack: [
                        {
                          table: {
                            widths: ["auto"],
                            body: [
                              [
                                {
                                  text: `STEP 0${st.stepNumber}`,
                                  fontSize: 7.5,
                                  bold: true,
                                  color: "#ffffff",
                                  fillColor: PDF_COLORS.ACCENT,
                                  margin: [4, 2, 4, 2],
                                },
                              ],
                            ],
                          },
                          layout: "noBorders",
                          margin: [0, 0, 0, 4],
                        },
                        { text: st.action, fontSize: 8.5, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 2] },
                        { text: `Screen: ${st.screenExperience}`, fontSize: 7.5, color: PDF_COLORS.TEXT_FAINT, margin: [0, 0, 0, 2] },
                        { text: st.systemResponse, fontSize: 8, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.3 },
                      ],
                      margin: [0, 0, 6, 0],
                    })),
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
        margin: [0, 0, 0, 10],
      },
    ],
  };
}

/* ── 07. REQUIREMENTS TRACEABILITY MATRIX TABLE ───────────────────────────── */
export function renderRequirementsTable(items: FeatureMatrix["items"]): unknown {
  return {
    table: {
      widths: [52, 90, "*", 80, 45],
      headerRows: 1,
      dontBreakRows: true,
      body: [
        [
          { text: "REQ ID", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "MODULE", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "CAPABILITY & OUTCOME", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "PRIMARY USER", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "RELEASE", style: "tableHeader", fillColor: PDF_COLORS.INK },
        ],
        ...items.map((it, i) => [
          { text: safeText((it.featureId || `REQ-${i + 1}`).replace("PRD-", "REQ-")), style: "tableCellBold", color: PDF_COLORS.ACCENT },
          { text: safeText(it.module || "Core"), style: "tableCellBold" },
          {
            stack: [
              { text: safeText(it.name), fontSize: 8.5, bold: true, color: PDF_COLORS.INK },
              formatTableDescription(it.whatItDoes || it.businessPurpose || ""),
            ],
          },
          { text: safeText(it.user || "Authorized User"), style: "tableCell", fontSize: 8 },
          {
            text: safeText(it.priority || "MVP"),
            style: "tableCellBold",
            color: it.priority === "MVP" ? PDF_COLORS.ACCENT : PDF_COLORS.TEXT_MUTED,
            alignment: "center",
          },
        ]),
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
    margin: [0, 6, 0, 14],
  };
}

/* ── 08. TESTABLE ACCEPTANCE CRITERIA CARD ─────────────────────────────────── */
export function renderAcceptanceCard(spec: AcceptanceSpec): unknown {
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
                  { text: `${safeText(spec.id || "AC")}: ${safeText(spec.featureTitle)}`, fontSize: 10.5, bold: true, color: PDF_COLORS.INK },
                  { text: "GIVEN-WHEN-THEN VERIFICATION", style: "eyebrow", alignment: "right" },
                ],
                margin: [0, 0, 0, 4],
              },
              hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 6]),
              {
                text: [{ text: "GIVEN  ", bold: true, color: PDF_COLORS.ACCENT, fontSize: 8.5 }, { text: safeText(spec.given) || "", fontSize: 8.5, color: PDF_COLORS.INK_LIGHT }],
                margin: [0, 0, 0, 2],
              },
              {
                text: [{ text: "WHEN   ", bold: true, color: PDF_COLORS.ACCENT, fontSize: 8.5 }, { text: safeText(spec.when) || "", fontSize: 8.5, color: PDF_COLORS.INK_LIGHT }],
                margin: [0, 0, 0, 4],
              },
              { text: "THEN COMMITTED OUTCOMES:", fontSize: 8, bold: true, color: PDF_COLORS.INK, margin: [0, 0, 0, 2] },
              ...(spec.then || []).map((t) => ({
                text: `• ${safeText(t)}`,
                fontSize: 8,
                color: PDF_COLORS.TEXT_MUTED,
                lineHeight: 1.35,
                margin: [4, 0, 0, 2],
              })),
              ...(spec.failureBehavior
                ? [{ text: `Graceful Failure Protocol: ${safeText(spec.failureBehavior)}`, fontSize: 7.5, color: PDF_COLORS.WARNING, margin: [0, 3, 0, 0] }]
                : []),
            ],
            fillColor: "#ffffff",
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
    margin: [0, 0, 0, 8],
  };
}

/* ── 09. MULTI-TIER SYSTEM ARCHITECTURE DIAGRAM ────────────────────────────── */
export function renderArchitectureDiagram(layers: ArchitectureLayer[]): unknown {
  const tiers = [
    { num: "TIER 01", name: "CLIENT & PRESENTATION LAYER", tech: "Next.js / React 19 / Tailwind / Mobile Responsive", desc: "Interactive client workspaces, executive analytics console, responsive views", color: PDF_COLORS.INK },
    { num: "TIER 02", name: "API GATEWAY & SECURITY PERIMETER", tech: "NextAuth v5 / RBAC / Rate Limiting / TLS 1.3", desc: "Token authentication, session validation, request authorization, telemetry", color: "#1e3a8a" },
    { num: "TIER 03", name: "APPLICATION & DOMAIN WORKFLOW ENGINE", tech: "TypeScript Domain Services / ACID Transactions", desc: "State machine orchestration, rule validation, automated event dispatch", color: PDF_COLORS.ACCENT },
    { num: "TIER 04", name: "DATASTORE & AUDIT LEDGER", tech: "Prisma ORM / Relational Database / SQLite & Postgres", desc: "Encrypted records at rest, immutable activity audit ledger, relational integrity", color: "#15803d" },
    { num: "TIER 05", name: "EXTERNAL SERVICES & INTEGRATIONS", tech: "Resend / WhatsApp API / Payment Gateways / Webhooks", desc: "Transactional email, client alerts, payment verification, external sync", color: "#475569" },
  ];

  return {
    stack: [
      ...tiers.map((tier, idx) => ({
        stack: [
          {
            table: {
              widths: [65, "*", 140],
              body: [
                [
                  {
                    text: tier.num,
                    fontSize: 8,
                    bold: true,
                    color: "#ffffff",
                    fillColor: tier.color,
                    alignment: "center",
                    margin: [2, 8, 2, 8],
                  },
                  {
                    stack: [
                      { text: tier.name, fontSize: 9.5, bold: true, color: PDF_COLORS.INK },
                      { text: tier.desc, fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 0] },
                    ],
                    fillColor: PDF_COLORS.BG_CARD_TINT,
                    margin: [8, 6, 8, 6],
                  },
                  {
                    stack: [
                      { text: "TECHNOLOGY", fontSize: 7, bold: true, color: PDF_COLORS.TEXT_FAINT },
                      { text: tier.tech, fontSize: 8, bold: true, color: PDF_COLORS.INK_LIGHT },
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
          },
          ...(idx < tiers.length - 1
            ? [
                {
                  text: "↓  Secure Domain Flow & Event Transport",
                  fontSize: 7.5,
                  color: PDF_COLORS.TEXT_FAINT,
                  alignment: "center",
                  margin: [0, 2, 0, 2],
                },
              ]
            : []),
        ],
        margin: [0, 0, 0, 0],
      })),
    ],
    margin: [0, 6, 0, 14],
  };
}

/* ── 10. EXTERNAL INTEGRATION SPECIFICATION CARD ──────────────────────────── */
export function renderIntegrationCard(spec: IntegrationSpec): unknown {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              {
                columns: [
                  { text: spec.serviceName || "External Service", fontSize: 11, bold: true, color: PDF_COLORS.INK },
                  {
                    width: "auto",
                    table: {
                      widths: ["auto"],
                      body: [
                        [
                          {
                            text: `${spec.category || "API"} · ${spec.direction || "BIDIRECTIONAL"}`,
                            fontSize: 7.5,
                            bold: true,
                            color: PDF_COLORS.ACCENT,
                            fillColor: PDF_COLORS.ACCENT_LIGHT,
                            margin: [6, 2, 6, 2],
                          },
                        ],
                      ],
                    },
                    layout: "noBorders",
                  },
                ],
                margin: [0, 0, 0, 4],
              },
              { text: spec.purpose, fontSize: 9, color: PDF_COLORS.INK_LIGHT, margin: [0, 0, 0, 6] },
              hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 6]),
              {
                columns: [
                  {
                    width: "33%",
                    text: [{ text: "Data Exchanged: ", bold: true, fontSize: 8, color: PDF_COLORS.INK }, { text: spec.dataExchanged || "Operational Events", fontSize: 8, color: PDF_COLORS.TEXT_MUTED }],
                  },
                  {
                    width: "33%",
                    text: [{ text: "Execution Trigger: ", bold: true, fontSize: 8, color: PDF_COLORS.INK }, { text: spec.trigger || "System Event Hook", fontSize: 8, color: PDF_COLORS.TEXT_MUTED }],
                  },
                  {
                    width: "34%",
                    text: [{ text: "Failure Handling: ", bold: true, fontSize: 8, color: PDF_COLORS.WARNING }, { text: spec.failureBehavior || "Automatic Retry with Dead-Letter Alert", fontSize: 8, color: PDF_COLORS.TEXT_MUTED }],
                  },
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
    margin: [0, 0, 0, 8],
  };
}

/* ── 11. SECURITY ARCHITECTURE (Layered Defense Model) ─────────────────────── */
export function renderSecurityBoundaries(boundary: SecurityBoundary): unknown {
  const items = boundary.boundaries || [];

  return {
    table: {
      widths: [95, "*", 160],
      headerRows: 1,
      body: [
        [
          { text: "DEFENSE LAYER", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "ENGINEERING MECHANISM", style: "tableHeader", fillColor: PDF_COLORS.INK },
          { text: "THREAT MITIGATION", style: "tableHeader", fillColor: PDF_COLORS.INK },
        ],
        ...items.map((sb) => [
          { text: sb.layer, style: "tableCellBold", color: PDF_COLORS.ACCENT },
          { text: sb.mechanism, style: "tableCell" },
          { text: sb.threatProtection, style: "tableCell", color: PDF_COLORS.SUCCESS },
        ]),
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
    margin: [0, 6, 0, 14],
  };
}

/* ── 02. BUSINESS CONTEXT STORYTELLING CARDS ──────────────────────────────── */
export function renderBusinessContextCards(blocks: ProposalBlock[]): unknown {
  let enterpriseProfile = "";
  let customerProfile = "";
  let differentiator = "";
  const goals: string[] = [];

  let currentHeading = "";
  blocks.forEach((b) => {
    if (b.type === "heading") {
      currentHeading = b.text.toLowerCase();
    } else if (b.type === "paragraph") {
      if (currentHeading.includes("customer") || currentHeading.includes("market")) {
        customerProfile = b.text;
      } else if (currentHeading.includes("different") || currentHeading.includes("core")) {
        differentiator = b.text;
      } else if (currentHeading.includes("enterprise") || !enterpriseProfile) {
        enterpriseProfile = b.text;
      }
    } else if (b.type === "list") {
      goals.push(...b.items);
    }
  });

  return {
    stack: [
      // 1. Enterprise Profile Hero Block
      {
        table: {
          widths: ["*"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  { text: "ENTERPRISE PROFILE & OPERATIONAL CONTEXT", style: "eyebrow", color: PDF_COLORS.ACCENT, margin: [0, 0, 0, 3] },
                  { text: safeText(enterpriseProfile || "Operational infrastructure and digital systems engineering."), fontSize: 9.5, color: PDF_COLORS.INK, lineHeight: 1.45 },
                ],
                fillColor: "#fffdfa",
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
        margin: [0, 0, 0, 10],
      },

      // 2. Customer & Differentiator 2-Column Grid
      {
        table: {
          widths: ["50%", "50%"],
          dontBreakRows: true,
          body: [
            [
              {
                stack: [
                  { text: "CUSTOMER & TARGET MARKET PROFILE", style: "eyebrow", color: PDF_COLORS.INK, margin: [0, 0, 0, 3] },
                  { text: safeText(customerProfile || "Growing businesses, startups, and operational teams."), fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.4 },
                ],
                fillColor: "#f8fafc",
                margin: [8, 8, 8, 8],
              },
              {
                stack: [
                  { text: "CORE MARKET DIFFERENTIATOR", style: "eyebrow", color: PDF_COLORS.SUCCESS, margin: [0, 0, 0, 3] },
                  { text: safeText(differentiator || "Purpose-built operational automation combining custom development and integrations."), fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.4 },
                ],
                fillColor: "#f0fdf4",
                margin: [8, 8, 8, 8],
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
        margin: [0, 0, 0, 10],
      },

      // 3. Strategic Engagement Goals Card
      ...(goals.length > 0
        ? [
            {
              table: {
                widths: ["*"],
                dontBreakRows: true,
                body: [
                  [
                    {
                      stack: [
                        { text: "STRATEGIC ENGAGEMENT GOALS", style: "eyebrow", color: PDF_COLORS.INK, margin: [0, 0, 0, 6] },
                        {
                          table: {
                            widths: ["50%", "50%"],
                            body: chunkArray(goals, 2).map((row, rIdx) => [
                              {
                                columns: [
                                  { width: 14, text: `0${rIdx * 2 + 1}`, fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 1, 0, 0] },
                                  { width: "*", text: safeText(row[0] || ""), fontSize: 8.5, bold: true, color: PDF_COLORS.INK },
                                ],
                                margin: [0, 2, 0, 2],
                              },
                              {
                                columns: row[1]
                                  ? [
                                      { width: 14, text: `0${rIdx * 2 + 2}`, fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 1, 0, 0] },
                                      { width: "*", text: safeText(row[1]), fontSize: 8.5, bold: true, color: PDF_COLORS.INK },
                                    ]
                                  : [],
                                margin: [0, 2, 0, 2],
                              },
                            ]),
                          },
                          layout: "noBorders",
                        },
                      ],
                      fillColor: "#ffffff",
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
              margin: [0, 0, 0, 10],
            },
          ]
        : []),
    ],
  };
}

/* ── 12. QUALITY ASSURANCE (6-Gate Model & Verification Procedures) ─────────── */
export function renderQAVerificationModel(qa: QAVerification): unknown {
  const gates = [
    { gate: "GATE 01", title: "Functional & Unit Verification", criteria: "100% automated test coverage on business rules and data models." },
    { gate: "GATE 02", title: "API & Integration Verification", criteria: "Strict contract testing on all inbound/outbound external service webhooks." },
    { gate: "GATE 03", title: "Security & Vulnerability Audit", criteria: "Zero critical CVE vulnerabilities, RBAC boundary validation, OWASP compliance." },
    { gate: "GATE 04", title: "Performance & Stress Verification", criteria: "Under 1.5s p95 response time under concurrent operational simulation." },
    { gate: "GATE 05", title: "User Acceptance Testing (UAT)", criteria: "Client stakeholder walkthrough, workflow validation, and formal feature sign-off." },
    { gate: "GATE 06", title: "Production Readiness Review", criteria: "Environment configuration, zero-downtime cutover plan, and disaster backup audit." },
  ];

  return {
    stack: [
      {
        table: {
          widths: ["*", "*"],
          dontBreakRows: true,
          body: [
            ...Array.from({ length: 3 }).map((_, rIdx) => {
              const g1 = gates[rIdx * 2];
              const g2 = gates[rIdx * 2 + 1];

              const cell = (g: (typeof gates)[0]) => ({
                stack: [
                  {
                    columns: [
                      {
                        width: "auto",
                        text: g.gate,
                        fontSize: 7.5,
                        bold: true,
                        color: PDF_COLORS.ACCENT,
                        margin: [0, 1, 6, 0],
                      },
                      { text: safeText(g.title), fontSize: 9, bold: true, color: PDF_COLORS.INK, margin: [0, 1, 0, 0] },
                    ],
                    margin: [0, 0, 0, 3],
                  },
                  { text: safeText(g.criteria), fontSize: 8, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.35 },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [8, 6, 8, 6],
              });

              return [cell(g1), cell(g2)];
            }),
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
        margin: [0, 0, 0, 8],
      },

      // Feature Verification Procedures Table
      ...(qa.items && qa.items.length > 0
        ? [
            {
              text: "FEATURE VERIFICATION & ACCEPTANCE PROCEDURES",
              style: "eyebrow",
              margin: [0, 6, 0, 4],
            },
            {
              table: {
                headerRows: 1,
                dontBreakRows: true,
                widths: ["26%", "18%", "30%", "26%"],
                body: [
                  [
                    { text: "WORKFLOW / FEATURE", style: "tableHeader", fillColor: PDF_COLORS.INK },
                    { text: "TEST TYPE", style: "tableHeader", fillColor: PDF_COLORS.INK },
                    { text: "PROCEDURE & EXPECTED RESULT", style: "tableHeader", fillColor: PDF_COLORS.INK },
                    { text: "ACCEPTANCE VERIFICATION", style: "tableHeader", fillColor: PDF_COLORS.INK },
                  ],
                  ...qa.items.map((it) => [
                    { text: safeText(it.featureOrWorkflow), fontSize: 8, bold: true, color: PDF_COLORS.INK },
                    { text: safeText(it.testType), fontSize: 7.5, bold: true, color: PDF_COLORS.ACCENT },
                    {
                      text: [
                        { text: "Proc: ", bold: true, fontSize: 7.5, color: PDF_COLORS.INK },
                        { text: safeText(it.testProcedure) + "\n", fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED },
                        { text: "Exp: ", bold: true, fontSize: 7.5, color: PDF_COLORS.SUCCESS },
                        { text: safeText(it.expectedResult), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED },
                      ],
                      lineHeight: 1.25,
                    },
                    { text: safeText(it.acceptanceVerification), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.25 },
                  ]),
                ],
              },
              layout: {
                hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.4),
                vLineWidth: () => 0,
                hLineColor: (i: number) => (i <= 1 ? PDF_COLORS.INK : PDF_COLORS.BORDER),
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 4,
                paddingBottom: () => 4,
                fillColor: (i: number) => (i === 0 ? null : i % 2 === 0 ? PDF_COLORS.BG_CARD_TINT : null),
              },
              margin: [0, 2, 0, 6],
            },
          ]
        : []),
    ],
  };
}

/* ── 13. DELIVERY ROADMAP & RELEASE MILESTONES ─────────────────────────────── */
export function renderRoadmapPhases(roadmap: RoadmapPhase): unknown {
  const phases = roadmap.phases || [];

  return {
    stack: [
      ...phases.map((ph, idx) => ({
        table: {
          widths: [44, "*", 125],
          dontBreakRows: true,
          body: [
            [
              {
                text: safeText(ph.phaseNumber || `0${idx + 1}`),
                fontSize: 14,
                bold: true,
                color: PDF_COLORS.ACCENT,
                alignment: "center",
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [0, 6, 0, 6],
              },
              {
                stack: [
                  { text: safeText(ph.name), fontSize: 9.5, bold: true, color: PDF_COLORS.INK },
                  { text: safeText(ph.focus || ""), fontSize: 8, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 2] },
                  {
                    text: [
                      { text: "Committed Deliverables: ", bold: true, fontSize: 7.5, color: PDF_COLORS.INK },
                      { text: safeText((ph.deliverables || []).join(" · ")), fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED },
                    ],
                  },
                ],
                fillColor: "#ffffff",
                margin: [7, 4, 7, 4],
              },
              {
                stack: [
                  { text: "ACCEPTANCE GATE", fontSize: 6.5, bold: true, color: PDF_COLORS.TEXT_FAINT },
                  { text: safeText(ph.verificationGate || "Milestone Sign-Off"), fontSize: 8, bold: true, color: PDF_COLORS.SUCCESS, margin: [0, 1, 0, 0] },
                  ...(ph.duration ? [{ text: `Duration: ${safeText(ph.duration)}`, fontSize: 7, color: PDF_COLORS.TEXT_MUTED, margin: [0, 1, 0, 0] }] : []),
                ],
                fillColor: "#ffffff",
                margin: [7, 4, 7, 4],
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
        margin: [0, 0, 0, 4],
      })),
    ],
    margin: [0, 4, 0, 8],
  };
}

/* ── 14. COMMERCIAL TERMS & INVESTMENT SCHEDULE ───────────────────────────── */
export function renderCommercialSchedule(doc: ProposalDoc, headers?: string[], rows?: string[][]): unknown {
  const milestones = [
    { phase: "Milestone 01: Project Inception & Architecture", scope: "Intake verification, domain data schema, infrastructure setup", pct: "30%", amt: doc.meta.amount ? `₹${Math.round(doc.meta.amount * 0.3).toLocaleString("en-IN")}` : "30%" },
    { phase: "Milestone 02: Core Platform & Modules Build", scope: "Core functional modules, user flows, and business rules", pct: "40%", amt: doc.meta.amount ? `₹${Math.round(doc.meta.amount * 0.4).toLocaleString("en-IN")}` : "40%" },
    { phase: "Milestone 03: Final Verification & Production Launch", scope: "Integrations, security hardening, UAT sign-off, live cutover", pct: "30%", amt: doc.meta.amount ? `₹${Math.round(doc.meta.amount * 0.3).toLocaleString("en-IN")}` : "30%" },
  ];

  return {
    stack: [
      // Big Investment Hero Card
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      { text: "TOTAL ENGAGEMENT INVESTMENT", style: "eyebrow", color: PDF_COLORS.ACCENT },
                      { text: doc.meta.amountLabel || "Fixed Scope Milestone", fontSize: 22, bold: true, color: PDF_COLORS.INK, margin: [0, 2, 0, 0] },
                      { text: "Fixed scope delivery commitment with guaranteed verification gates", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                    ],
                  },
                  {
                    width: "auto",
                    table: {
                      widths: ["auto"],
                      body: [
                        [
                          {
                            text: "COMMITTED FIXED SCOPE",
                            fontSize: 8,
                            bold: true,
                            color: "#ffffff",
                            fillColor: PDF_COLORS.INK,
                            margin: [8, 4, 8, 4],
                          },
                        ],
                      ],
                    },
                    layout: "noBorders",
                    margin: [0, 6, 0, 0],
                  },
                ],
                fillColor: PDF_COLORS.ACCENT_LIGHT,
                margin: [12, 10, 12, 10],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => PDF_COLORS.ACCENT_BORDER,
          vLineColor: () => PDF_COLORS.ACCENT_BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 14],
      },

      // Milestone Payment Schedule Table
      {
        table: {
          widths: [130, "*", 45, 80],
          headerRows: 1,
          body: [
            [
              { text: "DELIVERY MILESTONE", style: "tableHeader", fillColor: PDF_COLORS.INK },
              { text: "SCOPE & VERIFICATION PREREQUISITE", style: "tableHeader", fillColor: PDF_COLORS.INK },
              { text: "ALLOCATION", style: "tableHeader", fillColor: PDF_COLORS.INK, alignment: "center" },
              { text: "INVESTMENT", style: "tableHeader", fillColor: PDF_COLORS.INK, alignment: "right" },
            ],
            ...milestones.map((m) => [
              { text: m.phase, style: "tableCellBold" },
              { text: m.scope, style: "tableCell" },
              { text: m.pct, style: "tableCellBold", alignment: "center", color: PDF_COLORS.ACCENT },
              { text: m.amt, style: "tableCellBold", alignment: "right" },
            ]),
            [
              { text: "TOTAL COMMITTED INVESTMENT", colSpan: 2, style: "tableCellBold", fillColor: PDF_COLORS.BG_CARD_TINT },
              {},
              { text: "100%", style: "tableCellBold", alignment: "center", fillColor: PDF_COLORS.BG_CARD_TINT, color: PDF_COLORS.ACCENT },
              { text: doc.meta.amountLabel, style: "tableCellBold", alignment: "right", fillColor: PDF_COLORS.BG_CARD_TINT, color: PDF_COLORS.ACCENT },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i <= 1 ? 0.8 : 0.4),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? PDF_COLORS.INK : PDF_COLORS.BORDER),
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 14],
      },
    ],
  };
}

/* ── 15. KPI & OUTCOME IMPACT CARDS ────────────────────────────────────────── */
export function renderOutcomeKPIs(doc: ProposalDoc): unknown {
  const kpis = [
    { num: "50%+", label: "REDUCTION IN MANUAL PROCESS TIME", desc: "Automated state progression and structured digital handoffs." },
    { num: "99.9%", label: "DATA & AUDIT INTEGRITY", desc: "Every transaction recorded in immutable ledger with actor provenance." },
    { num: "<1.5s", label: "P95 PLATFORM RESPONSE LATENCY", desc: "High-performance edge delivery with optimized query execution." },
    { num: "0", label: "UNAUTHORIZED ACCESS ATTEMPTS", desc: "Strict RBAC perimeter enforcing tenant isolation across all endpoints." },
  ];

  return {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        kpis.map((k) => ({
          stack: [
            { text: k.num, fontSize: 20, bold: true, color: PDF_COLORS.ACCENT, margin: [0, 0, 0, 2] },
            { text: k.label, fontSize: 7, bold: true, color: PDF_COLORS.INK, characterSpacing: 0.8, margin: [0, 0, 0, 3] },
            { text: k.desc, fontSize: 7.5, color: PDF_COLORS.TEXT_MUTED, lineHeight: 1.3 },
          ],
          fillColor: PDF_COLORS.BG_CARD_TINT,
          margin: [8, 8, 8, 8],
        })),
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
    margin: [0, 4, 0, 14],
  };
}

/* ── 16. DIGITAL AUTHORIZATION & SIGN-OFF PAGE ────────────────────────────── */
export function renderAuthorizationPage(doc: ProposalDoc, approval: DigitalApproval): unknown {
  const date = new Date(doc.meta.date);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return {
    stack: [
      // Hero Closing Statement
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  { text: "ENGAGEMENT COMMITMENT & AUTHORIZATION", style: "eyebrow", color: PDF_COLORS.ACCENT },
                  { text: `Ready to Build: ${doc.meta.title}`, fontSize: 16, bold: true, color: PDF_COLORS.INK, margin: [0, 2, 0, 4] },
                  {
                    text: `By signing or confirming this proposal, ${doc.meta.clientName} authorizes the commencement of Phase 01 Discovery and Engineering under the scope, terms, and investment detailed herein.`,
                    style: "bodyLead",
                    color: PDF_COLORS.INK_LIGHT,
                  },
                ],
                fillColor: PDF_COLORS.BG_CARD_TINT,
                margin: [12, 10, 12, 10],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => PDF_COLORS.BORDER,
          vLineColor: () => PDF_COLORS.BORDER,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 16],
      },

      // Official Proposal Acceptance Certificate
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: "OFFICIAL DIGITAL ACCEPTANCE CERTIFICATE", style: "eyebrow", color: PDF_COLORS.INK },
                      { text: `REF: ${doc.meta.reference}`, fontSize: 8, bold: true, color: PDF_COLORS.ACCENT, alignment: "right" },
                    ],
                    margin: [0, 0, 0, 8],
                  },
                  hr(PDF_COLORS.BORDER_LIGHT, 0.5, [0, 0, 0, 10]),

                  {
                    columns: [
                      {
                        width: "50%",
                        stack: [
                          { text: "AUTHORIZED CLIENT ENTITY", style: "eyebrowMuted", margin: [0, 0, 0, 2] },
                          { text: doc.meta.clientName, fontSize: 11, bold: true, color: PDF_COLORS.INK },
                          { text: `Authorized Signatory: ${approval.authorizedPerson || doc.meta.preparedFor || "Client Representative"}`, fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                          { text: `Effective Acceptance Date: ${approval.acceptanceDate || dateStr}`, fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                        ],
                      },
                      {
                        width: "50%",
                        stack: [
                          { text: "COMMITTED ENGAGEMENT SCOPE", style: "eyebrowMuted", margin: [0, 0, 0, 2] },
                          { text: `Total Approved Investment: ${doc.meta.amountLabel}`, fontSize: 11, bold: true, color: PDF_COLORS.ACCENT },
                          { text: `Scope Baseline: ${approval.approvedScope || "Committed 11 Modules"}`, fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                          { text: "Verification Protocol: 6 Engineering Quality Gates", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED, margin: [0, 2, 0, 0] },
                        ],
                      },
                    ],
                    margin: [0, 0, 0, 14],
                  },

                  // Digital Signature Boxes
                  {
                    columns: [
                      {
                        width: "48%",
                        stack: [
                          { text: "FOR THE CLIENT", style: "eyebrowMuted", margin: [0, 0, 0, 6] },
                          { text: approval.authorizedPerson || "Authorized Signatory", fontSize: 10, bold: true, color: PDF_COLORS.INK },
                          { text: doc.meta.clientName, fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED },
                          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8, lineColor: PDF_COLORS.BORDER_STRONG }], margin: [0, 22, 0, 4] },
                          { text: "SIGNATURE & DATE", fontSize: 7, color: PDF_COLORS.TEXT_FAINT, characterSpacing: 1 },
                        ],
                        fillColor: "#ffffff",
                        margin: [8, 8, 8, 8],
                      },
                      { width: "4%", text: "" },
                      {
                        width: "48%",
                        stack: [
                          { text: "FOR THE PROVIDER", style: "eyebrowMuted", margin: [0, 0, 0, 6] },
                          { text: doc.meta.preparedBy, fontSize: 10, bold: true, color: PDF_COLORS.INK },
                          { text: "Strategy & Technology Practice Leader", fontSize: 8.5, color: PDF_COLORS.TEXT_MUTED },
                          { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8, lineColor: PDF_COLORS.BORDER_STRONG }], margin: [0, 22, 0, 4] },
                          { text: "DIGITAL VERIFICATION STAMP", fontSize: 7, color: PDF_COLORS.TEXT_FAINT, characterSpacing: 1 },
                        ],
                        fillColor: "#ffffff",
                        margin: [8, 8, 8, 8],
                      },
                    ],
                  },
                ],
                fillColor: "#ffffff",
                margin: [12, 10, 12, 10],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => PDF_COLORS.ACCENT,
          vLineColor: () => PDF_COLORS.ACCENT,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 16],
      },
    ],
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   PROPOSAL PDF DESIGN SYSTEM — THEME & DESIGN TOKENS
   ────────────────────────────────────────────────────────────────────────────
   Editorial + Technology visual identity for Business OS Enterprise Proposals.
   Deep charcoal primary, warm paper secondary, burned terra-cotta accent,
   and precision typography scale.
   ──────────────────────────────────────────────────────────────────────────── */

export const PDF_COLORS = {
  // Primary ink & background
  INK: "#0f172a",          // Slate-900 (deep charcoal black)
  INK_LIGHT: "#1e293b",    // Slate-800
  TEXT_MUTED: "#475569",   // Slate-600
  TEXT_FAINT: "#94a3b8",   // Slate-400
  BG_PAGE: "#ffffff",      // Clean white page
  BG_PAPER: "#faf9f6",     // Warm editorial off-white
  BG_SUBTLE: "#f8fafc",    // Slate-50
  BG_CARD: "#ffffff",      // White card background
  BG_CARD_TINT: "#f8fafc", // Subtle slate card background

  // Business OS distinctive accent
  ACCENT: "#b5452a",       // Warm burned terra-cotta / amber
  ACCENT_DARK: "#92341d",  // Deep terra-cotta
  ACCENT_LIGHT: "#fdf4f1", // Light accent wash
  ACCENT_BORDER: "#f1c8be",// Border tint

  // Structural borders & rules
  BORDER: "#e2e8f0",       // Slate-200
  BORDER_LIGHT: "#f1f5f9", // Slate-100
  BORDER_STRONG: "#cbd5e1",// Slate-300

  // Semantic statuses (only used for meaningful status indicators)
  SUCCESS: "#15803d",      // Emerald-700
  SUCCESS_BG: "#f0fdf4",   // Emerald-50
  SUCCESS_BORDER: "#bbf7d0",
  WARNING: "#b45309",      // Amber-700
  WARNING_BG: "#fffbeb",   // Amber-50
  WARNING_BORDER: "#fde68a",
  DANGER: "#b91c1c",       // Red-700
  DANGER_BG: "#fef2f2",    // Red-50
  DANGER_BORDER: "#fecaca",

  // Architecture / Flow diagram node colors
  TIER_CLIENT: "#0f172a",
  TIER_GATEWAY: "#1e293b",
  TIER_DOMAIN: "#b5452a",
  TIER_DATA: "#334155",
  TIER_EXTERNAL: "#475569",
} as const;

export const PDF_FONTS = {
  FAMILY: "Roboto",
} as const;

export const PDF_STYLES = {
  // Display typography
  coverDisplay: {
    font: PDF_FONTS.FAMILY,
    fontSize: 32,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.15,
  },
  coverSubtitle: {
    font: PDF_FONTS.FAMILY,
    fontSize: 13,
    color: PDF_COLORS.TEXT_MUTED,
    lineHeight: 1.4,
  },
  coverKicker: {
    font: PDF_FONTS.FAMILY,
    fontSize: 9,
    bold: true,
    color: PDF_COLORS.ACCENT,
    characterSpacing: 2.5,
  },

  // Chapter & Section headers
  chapterNumber: {
    font: PDF_FONTS.FAMILY,
    fontSize: 28,
    bold: true,
    color: PDF_COLORS.ACCENT,
    lineHeight: 1,
  },
  sectionTitle: {
    font: PDF_FONTS.FAMILY,
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.2,
  },
  sectionSubtitle: {
    font: PDF_FONTS.FAMILY,
    fontSize: 10,
    color: PDF_COLORS.TEXT_MUTED,
    lineHeight: 1.45,
  },
  eyebrow: {
    font: PDF_FONTS.FAMILY,
    fontSize: 7.5,
    bold: true,
    color: PDF_COLORS.ACCENT,
    characterSpacing: 1.8,
  },
  eyebrowMuted: {
    font: PDF_FONTS.FAMILY,
    fontSize: 7.5,
    bold: true,
    color: PDF_COLORS.TEXT_FAINT,
    characterSpacing: 1.6,
  },

  // Headings
  h1: {
    font: PDF_FONTS.FAMILY,
    fontSize: 15,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.25,
  },
  h2: {
    font: PDF_FONTS.FAMILY,
    fontSize: 12.5,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.3,
  },
  h3: {
    font: PDF_FONTS.FAMILY,
    fontSize: 10.5,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.35,
  },

  // Body content
  body: {
    font: PDF_FONTS.FAMILY,
    fontSize: 9.5,
    color: PDF_COLORS.INK_LIGHT,
    lineHeight: 1.55,
  },
  bodyLead: {
    font: PDF_FONTS.FAMILY,
    fontSize: 11,
    color: PDF_COLORS.INK,
    lineHeight: 1.6,
  },
  bodySmall: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8.5,
    color: PDF_COLORS.TEXT_MUTED,
    lineHeight: 1.45,
  },
  bodyMuted: {
    font: PDF_FONTS.FAMILY,
    fontSize: 9,
    color: PDF_COLORS.TEXT_MUTED,
    lineHeight: 1.5,
  },

  // Monospace & technical
  mono: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8,
    color: PDF_COLORS.INK,
    characterSpacing: 0.6,
  },
  monoFaint: {
    font: PDF_FONTS.FAMILY,
    fontSize: 7.5,
    color: PDF_COLORS.TEXT_FAINT,
    characterSpacing: 0.8,
  },

  // Tables
  tableHeader: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8,
    bold: true,
    color: "#ffffff",
    characterSpacing: 0.8,
  },
  tableHeaderMuted: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8,
    bold: true,
    color: PDF_COLORS.TEXT_MUTED,
    characterSpacing: 0.8,
  },
  tableCell: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8.5,
    color: PDF_COLORS.INK_LIGHT,
    lineHeight: 1.35,
  },
  tableCellBold: {
    font: PDF_FONTS.FAMILY,
    fontSize: 8.5,
    bold: true,
    color: PDF_COLORS.INK,
    lineHeight: 1.35,
  },

  // Running headers / footers
  headerText: {
    font: PDF_FONTS.FAMILY,
    fontSize: 7.5,
    color: PDF_COLORS.TEXT_FAINT,
    characterSpacing: 1.2,
  },
  footerText: {
    font: PDF_FONTS.FAMILY,
    fontSize: 7.5,
    color: PDF_COLORS.TEXT_FAINT,
    characterSpacing: 1,
  },
} as const;

export const PDF_PAGE_CONFIG = {
  size: "A4" as const,
  // [left, top, right, bottom]
  margins: [46, 48, 46, 46] as [number, number, number, number],
  usableWidth: 503.28, // 595.28 - 46*2
  usableHeight: 747.89, // 841.89 - 48 - 46
};

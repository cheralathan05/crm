import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";
import { getCommandCenterOverview } from "./analytics-pulse.service";
import { getEarlyDeliveryIntelligence } from "./early-delivery.service";
import { getAttentionCenterItems } from "./attention-center.service";
import { getCommercialAndCashflow } from "./commercial-cashflow.service";

export interface ReportGenerationInput {
  workspaceId: string;
  reportType?: string;
  title?: string;
  createdByName?: string;
  createdById?: string;
}

export interface GeneratedReportResult {
  snapshotId: string;
  title: string;
  version: number;
  executiveSummary: string;
  pdfPath: string;
  createdAt: string;
  downloadPdfUrl: string;
  downloadJsonUrl: string;
  downloadCsvUrl: string;
}

/**
 * Builds the Executive Business Report PDF using pdf-lib.
 */
async function buildReportPdf(params: {
  reportId: string;
  title: string;
  summary: string;
  companyName: string;
  dateStr: string;
  pulseItems: { label: string; status: string }[];
  attentionItems: string[];
  executionText: string;
  financialText: string;
}): Promise<{ storagePath: string; fullPath: string; fileSize: number }> {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `${params.reportId}.pdf`;
  const fullPath = path.join(reportsDir, fileName);
  const storagePath = `reports/${fileName}`;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Colors
  const primaryColor = rgb(0.1, 0.09, 0.08); // #1a1714
  const accentColor = rgb(0.71, 0.27, 0.16); // #b5452a
  const secondaryColor = rgb(0.42, 0.4, 0.36); // #6b655c
  const borderColor = rgb(0.9, 0.88, 0.84); // #e7e2d8

function sanitizePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/[—–]/g, "--")
    .replace(/₹/g, "INR ")
    .replace(/[✓✔]/g, "[OK]")
    .replace(/[⚠⚡]/g, "[!]")
    .replace(/[•·]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\t\n]/g, "");
}

  let y = height - 50;

  // Header Banner
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: width - 80,
    height: 55,
    color: rgb(0.97, 0.96, 0.94),
    borderColor,
    borderWidth: 1,
  });

  page.drawText(sanitizePdfText("BUSINESS OS -- OPERATIONAL INTELLIGENCE"), {
    x: 55,
    y: y - 22,
    size: 9,
    font: fontCourier,
    color: accentColor,
  });

  page.drawText(sanitizePdfText(params.title.toUpperCase()), {
    x: 55,
    y: y - 42,
    size: 16,
    font: fontHelveticaBold,
    color: primaryColor,
  });

  y -= 80;

  // Metadata block
  page.drawText(sanitizePdfText(`ORGANIZATION: ${params.companyName}`), {
    x: 45,
    y,
    size: 8,
    font: fontCourier,
    color: secondaryColor,
  });
  page.drawText(sanitizePdfText(`GENERATED: ${params.dateStr} | REPORT ID: ${params.reportId}`), {
    x: width - 300,
    y,
    size: 8,
    font: fontCourier,
    color: secondaryColor,
  });

  y -= 25;

  // Section 1: Executive Summary
  page.drawText(sanitizePdfText("01 -- EXECUTIVE SUMMARY"), {
    x: 45,
    y,
    size: 10,
    font: fontHelveticaBold,
    color: accentColor,
  });

  y -= 18;

  // Wrap summary lines
  const summaryWords = params.summary.split(" ");
  let currentLine = "";
  for (const word of summaryWords) {
    if ((currentLine + word).length > 85) {
      page.drawText(sanitizePdfText(currentLine), { x: 45, y, size: 9.5, font: fontHelvetica, color: primaryColor });
      y -= 14;
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine) {
    page.drawText(sanitizePdfText(currentLine), { x: 45, y, size: 9.5, font: fontHelvetica, color: primaryColor });
    y -= 20;
  }

  // Section 2: Business Pulse
  y -= 10;
  page.drawText(sanitizePdfText("02 -- BUSINESS PULSE & OPERATIONAL HEALTH"), {
    x: 45,
    y,
    size: 10,
    font: fontHelveticaBold,
    color: accentColor,
  });

  y -= 18;

  for (const p of params.pulseItems) {
    page.drawText(sanitizePdfText(`- ${p.label}: [ ${p.status} ]`), {
      x: 50,
      y,
      size: 9,
      font: fontCourier,
      color: primaryColor,
    });
    y -= 14;
  }

  // Section 3: Attention Required
  y -= 15;
  page.drawText(sanitizePdfText("03 -- ATTENTION REQUIRED & PRIORITY ACTIONS"), {
    x: 45,
    y,
    size: 10,
    font: fontHelveticaBold,
    color: accentColor,
  });

  y -= 18;

  if (params.attentionItems.length === 0) {
    page.drawText(sanitizePdfText("[OK] No critical bottlenecks or payment confirmations held."), {
      x: 50,
      y,
      size: 9,
      font: fontHelvetica,
      color: secondaryColor,
    });
    y -= 16;
  } else {
    for (const item of params.attentionItems.slice(0, 4)) {
      page.drawText(sanitizePdfText(`[!] ${item.slice(0, 90)}`), {
        x: 50,
        y,
        size: 8.5,
        font: fontHelvetica,
        color: primaryColor,
      });
      y -= 14;
    }
  }

  // Section 4: Execution & Financial
  y -= 15;
  page.drawText(sanitizePdfText("04 -- EXECUTION & FINANCIAL PERFORMANCE"), {
    x: 45,
    y,
    size: 10,
    font: fontHelveticaBold,
    color: accentColor,
  });

  y -= 18;
  page.drawText(sanitizePdfText(params.executionText), {
    x: 50,
    y,
    size: 9,
    font: fontHelvetica,
    color: primaryColor,
  });
  y -= 16;
  page.drawText(sanitizePdfText(params.financialText), {
    x: 50,
    y,
    size: 9,
    font: fontHelvetica,
    color: primaryColor,
  });

  // Footer
  page.drawText(
    sanitizePdfText("CONFIDENTIAL & PROPRIETARY -- GENERATED BY BUSINESS OS COMMAND CENTER -- REAL DATA ONLY"),
    {
      x: 75,
      y: 35,
      size: 7.5,
      font: fontCourier,
      color: secondaryColor,
    },
  );

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(fullPath, pdfBytes);

  return {
    storagePath,
    fullPath,
    fileSize: pdfBytes.length,
  };
}

/**
 * One-Click Executive Business Report Generator (Rules 41, 42, 44, 45, 87, 88, 89)
 */
export async function generateExecutiveBusinessReport(
  input: ReportGenerationInput,
): Promise<GeneratedReportResult> {
  const now = new Date();
  const title = input.title || "Monthly Business & Executive Operations Report";

  // 1. Gather all authentic data
  const [overview, attention, earlyDelivery, financial] = await Promise.all([
    getCommandCenterOverview(input.workspaceId, input.createdById || "system"),
    getAttentionCenterItems(input.workspaceId),
    getEarlyDeliveryIntelligence(input.workspaceId),
    getCommercialAndCashflow(input.workspaceId),
  ]);

  const workspace = await db.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { companyName: true },
  });
  const companyName = workspace?.companyName || "Enterprise Workspace";

  // 2. Formulate Real Executive Summary (Rule 42)
  const execSummary = `Operations remained active during this period. Total work items completed stand at ${overview.execution.completed} (${overview.execution.completionRate}% completion rate), with ${earlyDelivery.breakdown.verifiedEarlyCount} deliverables verified early without rework. Confirmed cash collections stand at ${financial.commercial.currency} ${financial.commercial.confirmedPaymentsValue.toLocaleString()} with ${financial.commercial.currency} ${financial.commercial.outstandingValue.toLocaleString()} outstanding across contracts. ${attention.totalCount > 0 ? `${attention.totalCount} operational item(s) require administrative action, primarily: ${attention.items[0]?.title || "review"}.` : "Zero critical blockers are currently impeding delivery."}`;

  // 3. Versioning (Rule 45)
  const latestSnapshot = await db.analyticsSnapshot.findFirst({
    where: { workspaceId: input.workspaceId, title },
    orderBy: { version: "desc" },
  });
  const nextVersion = latestSnapshot ? latestSnapshot.version + 1 : 1;

  // 4. Freeze Data Snapshot (Rule 44)
  const snapshotData = {
    overview,
    attention: attention.items,
    earlyDelivery,
    financial,
    generatedAt: now.toISOString(),
  };

  const snapshot = await db.analyticsSnapshot.create({
    data: {
      workspaceId: input.workspaceId,
      reportType: input.reportType || "EXECUTIVE_REPORT",
      title: `${title} (v${nextVersion})`,
      summary: execSummary,
      version: nextVersion,
      metrics: JSON.stringify(snapshotData),
      evidence: JSON.stringify(attention.items.map((i) => i.sourceId)),
      createdByName: input.createdByName || "Admin",
      createdById: input.createdById,
    },
  });

  // 5. Generate Real PDF (Rule 39 & 87)
  const pulseList = overview.pulse.map((p) => ({ label: p.category, status: p.status }));
  const attnList = attention.items.map((i) => `${i.title}: ${i.why}`);
  const execText = `Execution: ${overview.execution.completed}/${overview.execution.total} completed • ${earlyDelivery.breakdown.verifiedEarlyCount} verified early • ${overview.execution.blocked} blocked tasks.`;
  const finText = `Financial: ${financial.commercial.currency} ${financial.commercial.confirmedPaymentsValue.toLocaleString()} confirmed cash • ${financial.commercial.currency} ${financial.commercial.outstandingValue.toLocaleString()} outstanding receivables.`;

  const pdfResult = await buildReportPdf({
    reportId: snapshot.id,
    title: `${title} v${nextVersion}`,
    summary: execSummary,
    companyName,
    dateStr: now.toLocaleDateString(),
    pulseItems: pulseList,
    attentionItems: attnList,
    executionText: execText,
    financialText: finText,
  });

  // Update snapshot with PDF storage path
  await db.analyticsSnapshot.update({
    where: { id: snapshot.id },
    data: { pdfPath: pdfResult.storagePath },
  });

  // 6. Register as a BusinessDocument (Rule 89: Generated reports become Documents)
  await db.businessDocument.create({
    data: {
      title: `${title} — v${nextVersion}`,
      reference: `REP-${now.getFullYear()}-${snapshot.id.slice(-6).toUpperCase()}`,
      fileName: `${snapshot.id}.pdf`,
      category: "REPORT",
      status: "APPROVED",
      healthState: "READY",
      storagePath: pdfResult.storagePath,
      mimeType: "application/pdf",
      fileSize: pdfResult.fileSize,
      version: nextVersion,
      sourceType: "REPORT",
      sourceId: snapshot.id,
      summary: execSummary,
      createdByName: input.createdByName || "Admin",
    },
  });

  return {
    snapshotId: snapshot.id,
    title: `${title} (v${nextVersion})`,
    version: nextVersion,
    executiveSummary: execSummary,
    pdfPath: pdfResult.storagePath,
    createdAt: now.toISOString(),
    downloadPdfUrl: `/api/analytics/reports/${snapshot.id}/download?format=pdf`,
    downloadJsonUrl: `/api/analytics/reports/${snapshot.id}/download?format=json`,
    downloadCsvUrl: `/api/analytics/reports/${snapshot.id}/download?format=csv`,
  };
}

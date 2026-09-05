import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export interface ReceiptData {
  receiptNumber: string;
  transactionNumber: string;
  paymentDate: Date;
  confirmedAt: Date;
  confirmedByName: string;
  clientName: string;
  clientEmail?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  reason: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  companyName?: string;
}

export async function generateReceiptPdf(data: ReceiptData): Promise<{
  fullPath: string;
  storagePath: string;
  size: number;
  pageCount: number;
}> {
  const receiptsDir = path.join(process.cwd(), "uploads", "receipts");
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  const fileName = `${data.receiptNumber}.pdf`;
  const fullPath = path.join(receiptsDir, fileName);
  const storagePath = `receipts/${fileName}`;

  // Create PDF Document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points: 595 x 842
  const { width, height } = page.getSize();

  // Embed standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Palette colors
  const primaryColor = rgb(0.1, 0.09, 0.08); // Dark charcoal #1a1714
  const accentColor = rgb(0.71, 0.27, 0.16); // Terracotta #b5452a
  const secondaryColor = rgb(0.42, 0.4, 0.36); // Slate #6b655c
  const borderColor = rgb(0.9, 0.88, 0.84); // Border subtle #e7e2d8
  const headerBg = rgb(0.98, 0.97, 0.95); // Ivory tint #f9f7f4
  const successColor = rgb(0.17, 0.48, 0.29); // Forest green #2b7a4b

  // 1. Top Decorative Banner
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: headerBg,
  });

  page.drawLine({
    start: { x: 0, y: height - 120 },
    end: { x: width, y: height - 120 },
    thickness: 1,
    color: borderColor,
  });

  // Header Title & Logo text
  page.drawText("BUSINESS OS", {
    x: 48,
    y: height - 50,
    size: 16,
    font: fontHelveticaBold,
    color: accentColor,
  });

  page.drawText("FINANCIAL OPERATING SYSTEM — OFFICIAL PAYMENT RECEIPT", {
    x: 48,
    y: height - 68,
    size: 9,
    font: fontHelvetica,
    color: secondaryColor,
  });

  // Receipt Number on Top Right
  page.drawText(data.receiptNumber, {
    x: width - 200,
    y: height - 50,
    size: 14,
    font: fontCourier,
    color: primaryColor,
  });

  page.drawText(`DATE: ${data.paymentDate.toISOString().slice(0, 10)}`, {
    x: width - 200,
    y: height - 68,
    size: 9,
    font: fontHelvetica,
    color: secondaryColor,
  });

  // 2. Status Badge Box
  const statusBoxY = height - 165;
  page.drawRectangle({
    x: 48,
    y: statusBoxY,
    width: width - 96,
    height: 34,
    color: rgb(0.93, 0.97, 0.94),
    borderColor: rgb(0.7, 0.86, 0.75),
    borderWidth: 1,
  });

  page.drawText("STATUS: CONFIRMED & RECONCILED IN BUSINESS LEDGER", {
    x: 64,
    y: statusBoxY + 12,
    size: 10,
    font: fontHelveticaBold,
    color: successColor,
  });

  // 3. Client & Project Details (Two Columns)
  let curY = height - 225;

  page.drawText("ISSUED TO (CLIENT)", {
    x: 48,
    y: curY,
    size: 9,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  page.drawText("ISSUED BY", {
    x: 320,
    y: curY,
    size: 9,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  curY -= 18;
  page.drawText(data.clientName, {
    x: 48,
    y: curY,
    size: 13,
    font: fontHelveticaBold,
    color: primaryColor,
  });

  page.drawText(data.companyName || "Business OS Operating Workspace", {
    x: 320,
    y: curY,
    size: 12,
    font: fontHelveticaBold,
    color: primaryColor,
  });

  curY -= 16;
  if (data.clientEmail) {
    page.drawText(`Email: ${data.clientEmail}`, {
      x: 48,
      y: curY,
      size: 9.5,
      font: fontHelvetica,
      color: secondaryColor,
    });
  }

  page.drawText("Authoritative Commercial Ledger", {
    x: 320,
    y: curY,
    size: 9.5,
    font: fontHelvetica,
    color: secondaryColor,
  });

  if (data.projectName) {
    curY -= 16;
    page.drawText(`Project: ${data.projectName} (${data.projectCode || "N/A"})`, {
      x: 48,
      y: curY,
      size: 9.5,
      font: fontHelvetica,
      color: secondaryColor,
    });
  }

  // 4. Line Item Table
  curY -= 35;
  page.drawLine({
    start: { x: 48, y: curY },
    end: { x: width - 48, y: curY },
    thickness: 1,
    color: borderColor,
  });

  curY -= 16;
  page.drawText("DESCRIPTION / REASON", {
    x: 48,
    y: curY,
    size: 8.5,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  page.drawText("METHOD & REF", {
    x: 320,
    y: curY,
    size: 8.5,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  page.drawText("AMOUNT", {
    x: width - 110,
    y: curY,
    size: 8.5,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  curY -= 10;
  page.drawLine({
    start: { x: 48, y: curY },
    end: { x: width - 48, y: curY },
    thickness: 1,
    color: borderColor,
  });

  // Table Row
  curY -= 22;
  page.drawText(data.reason, {
    x: 48,
    y: curY,
    size: 10.5,
    font: fontHelveticaBold,
    color: primaryColor,
  });

  page.drawText(`${data.paymentMethod} — ${data.reference}`, {
    x: 320,
    y: curY,
    size: 9.5,
    font: fontCourier,
    color: primaryColor,
  });

  const formattedAmount = `${data.currency} ${data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  page.drawText(formattedAmount, {
    x: width - 120,
    y: curY,
    size: 11,
    font: fontHelveticaBold,
    color: primaryColor,
  });

  curY -= 18;
  page.drawLine({
    start: { x: 48, y: curY },
    end: { x: width - 48, y: curY },
    thickness: 1,
    color: borderColor,
  });

  // 5. Total Highlight Block
  curY -= 36;
  page.drawRectangle({
    x: width - 240,
    y: curY - 10,
    width: 192,
    height: 40,
    color: headerBg,
    borderColor,
    borderWidth: 1,
  });

  page.drawText("TOTAL PAID:", {
    x: width - 230,
    y: curY + 6,
    size: 9.5,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  page.drawText(formattedAmount, {
    x: width - 140,
    y: curY + 6,
    size: 12,
    font: fontHelveticaBold,
    color: accentColor,
  });

  // 6. Verification Details Section
  curY -= 70;
  page.drawText("TRANSACTION AUDIT & RECONCILIATION EVIDENCE", {
    x: 48,
    y: curY,
    size: 9,
    font: fontHelveticaBold,
    color: secondaryColor,
  });

  curY -= 18;
  page.drawText(`Transaction Number: ${data.transactionNumber}`, {
    x: 48,
    y: curY,
    size: 9,
    font: fontCourier,
    color: primaryColor,
  });

  curY -= 14;
  page.drawText(`Confirmed By: ${data.confirmedByName} on ${data.confirmedAt.toISOString()}`, {
    x: 48,
    y: curY,
    size: 8.5,
    font: fontHelvetica,
    color: secondaryColor,
  });

  curY -= 14;
  page.drawText(`Payment Gateway / Bank UTR: ${data.reference}`, {
    x: 48,
    y: curY,
    size: 8.5,
    font: fontCourier,
    color: secondaryColor,
  });

  // 7. Footer
  page.drawLine({
    start: { x: 48, y: 60 },
    end: { x: width - 48, y: 60 },
    thickness: 1,
    color: borderColor,
  });

  page.drawText("This is an electronically generated official receipt issued through Business OS Financial Ledger.", {
    x: 48,
    y: 44,
    size: 7.5,
    font: fontHelvetica,
    color: secondaryColor,
  });

  page.drawText(`Verified Document: ${data.receiptNumber} | Page 1 of 1`, {
    x: width - 250,
    y: 44,
    size: 7.5,
    font: fontHelvetica,
    color: secondaryColor,
  });

  // Save to disk
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(fullPath, Buffer.from(pdfBytes));

  return {
    fullPath,
    storagePath,
    size: pdfBytes.length,
    pageCount: 1,
  };
}

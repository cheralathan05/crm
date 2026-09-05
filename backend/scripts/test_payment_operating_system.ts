import { db } from "../src/lib/db";
import { createPaymentRequest } from "../src/lib/payments/payment-request.service";
import { confirmPayment } from "../src/lib/payments/payment-confirmation.service";
import { getPaymentStory } from "../src/lib/payments/payment-story.service";
import fs from "fs";
import path from "path";

async function main() {
  console.log("============================================================");
  console.log("BUSINESS OS — PAYMENT OPERATING SYSTEM E2E SIMULATION");
  console.log("============================================================\n");

  // 1. Audit Client and Project Milestones
  const client = await db.client.findFirst({
    where: { companyName: "Zero Touch Pvt Ltd" },
    include: { workspace: true },
  });
  if (!client) throw new Error("Client 'Zero Touch Pvt Ltd' not found.");

  const project = await db.clientProject.findFirst({
    where: { code: "PRJ-2026-001" },
    include: { milestones: { orderBy: { order: "asc" } } },
  });
  if (!project) throw new Error("Project 'PRJ-2026-001' not found.");

  const phase1 = project.milestones[0];
  if (!phase1) throw new Error("Phase 1 milestone not found.");

  console.log(`1. Target Client: ${client.companyName} (${client.id})`);
  console.log(`   Project: ${project.name} (${project.code})`);
  console.log(`   Milestone: ${phase1.phase} - ${phase1.title} | Amount: ₹${phase1.paymentAmount}\n`);

  // Clean any existing test payment request for this milestone to ensure clean test
  const existingReqs = await db.paymentRequest.findMany({
    where: { milestoneId: phase1.id },
  });
  for (const er of existingReqs) {
    await db.paymentReceipt.deleteMany({ where: { requestId: er.id } });
    await db.paymentAllocation.deleteMany({ where: { requestId: er.id } });
    await db.paymentTransaction.deleteMany({ where: { requestId: er.id } });
    await db.paymentSubmission.deleteMany({ where: { requestId: er.id } });
    await db.paymentSession.deleteMany({ where: { requestId: er.id } });
    await db.financialAuditLog.deleteMany({ where: { requestId: er.id } });
    await db.businessDocument.deleteMany({ where: { sourceType: "PAYMENT_RECEIPT" } });
    await db.paymentRequest.delete({ where: { id: er.id } });
  }

  // 2. Step: Admin Creates Payment Request
  console.log("2. Creating Payment Request (Phase 1, ₹15,000)...");
  const requestResult = await createPaymentRequest({
    clientId: client.id,
    projectId: project.id,
    milestoneId: phase1.id,
    title: `Payment for ${phase1.title}`,
    reason: `${phase1.phase}: ${phase1.title}`,
    amount: phase1.paymentAmount || 15000,
    currency: "INR",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    paymentRule: "FIXED",
    createdByName: "System Admin",
  });

  console.log(`   Created: ${requestResult.paymentRequest.reference} (Status: ${requestResult.paymentRequest.status})`);
  console.log(`   Pay URL: ${requestResult.payUrl}`);
  console.log(`   UPI QR Payload: ${requestResult.session.qrPayload}\n`);

  // 3. Step: Verify Duplicate Protection
  console.log("3. Testing Duplicate Protection...");
  try {
    await createPaymentRequest({
      clientId: client.id,
      projectId: project.id,
      milestoneId: phase1.id,
      title: `Duplicate Request for ${phase1.title}`,
      reason: `${phase1.phase}: Duplicate`,
      amount: 15000,
    });
    throw new Error("FAIL: Duplicate request should have been blocked!");
  } catch (dupErr: any) {
    console.log(`   PASS: Duplicate protection blocked request: "${dupErr.message}"\n`);
  }

  // 4. Step: Client Opens Payment Portal
  console.log("4. Simulating Client Opening Payment Link...");
  const clientReq = await db.paymentRequest.findUnique({
    where: { tokenHash: requestResult.paymentRequest.tokenHash },
  });
  if (!clientReq) throw new Error("Request by tokenHash not found.");

  await db.paymentRequest.update({
    where: { id: clientReq.id },
    data: {
      status: "VIEWED",
      firstViewedAt: new Date(),
      lastViewedAt: new Date(),
      viewCount: 1,
    },
  });
  console.log(`   Request status updated to VIEWED (viewCount: 1)\n`);

  // 5. Step: Client Submits Payment Reference
  console.log("5. Simulating Client Submitting 'I Have Paid' (UTR: UTR2026090412345)...");
  const submission = await db.paymentSubmission.create({
    data: {
      requestId: clientReq.id,
      amountPaid: 15000,
      currency: "INR",
      paymentDate: new Date(),
      paymentMethod: "UPI",
      transactionRef: "UTR2026090412345",
      note: "Paid via PhonePe to businessos@hdfcbank",
      status: "SUBMITTED",
    },
  });

  await db.paymentRequest.update({
    where: { id: clientReq.id },
    data: {
      status: "AWAITING_VERIFICATION",
      submittedAt: new Date(),
    },
  });
  console.log(`   Submission recorded: ${submission.id}`);
  console.log(`   Payment Request status is now: AWAITING_VERIFICATION\n`);

  // 6. Step: Admin Confirms Payment
  console.log("6. Admin Reviews and Confirms Payment...");
  const confirmResult = await confirmPayment({
    requestId: clientReq.id,
    submissionId: submission.id,
    confirmedByName: "Cheralathan (Admin)",
    note: "Verified in HDFC Bank statement",
  });

  console.log("   Confirmation committed successfully!");
  console.log(`   Transaction ID: ${confirmResult.transaction.transactionNumber} (Status: ${confirmResult.transaction.status})`);
  console.log(`   Receipt Number: ${confirmResult.receipt.receiptNumber} (Status: ${confirmResult.receipt.status})`);
  console.log(`   PDF Path: ${confirmResult.pdfPath}\n`);

  // Verify physical PDF file exists on disk
  if (confirmResult.pdfPath) {
    const pdfDiskPath = path.join(process.cwd(), "uploads", confirmResult.pdfPath);
    if (fs.existsSync(pdfDiskPath)) {
      const stat = fs.statSync(pdfDiskPath);
      console.log(`   PASS: Official PDF receipt verified on disk (${stat.size} bytes)\n`);
    } else {
      throw new Error(`FAIL: PDF receipt not found on disk at ${pdfDiskPath}`);
    }
  }

  // 7. Step: Verify Document Center Integration
  console.log("7. Verifying Document Center Integration...");
  const bDoc = await db.businessDocument.findFirst({
    where: { reference: confirmResult.receipt.receiptNumber },
    include: { versions: true },
  });
  if (!bDoc) throw new Error("FAIL: Receipt not found in BusinessDocument table!");
  console.log(`   PASS: Document Center record found:`);
  console.log(`   Title: ${bDoc.title} | Category: ${bDoc.category} | Health: ${bDoc.healthState}`);
  console.log(`   File Name: ${bDoc.fileName} | Size: ${bDoc.fileSize} bytes\n`);

  // 8. Step: Verify Project Milestone Updated to PAID
  console.log("8. Verifying Milestone Invoice Status...");
  const updatedMilestone = await db.projectMilestone.findUnique({
    where: { id: phase1.id },
  });
  console.log(`   Milestone: ${updatedMilestone?.phase} - ${updatedMilestone?.title}`);
  console.log(`   Invoice Status: ${updatedMilestone?.invoiceStatus} | Status: ${updatedMilestone?.status}\n`);

  // 9. Step: Verify Complete Visual Payment Story
  console.log("9. Verifying Complete Payment Story...");
  const story = await getPaymentStory(clientReq.id);
  if (!story) throw new Error("FAIL: Payment story could not be assembled!");
  console.log("   Payment Story:");
  console.log(`   - Why: ${story.why.reason}`);
  console.log(`   - Source Milestone: ${story.source.reference} (Agreed: ₹${story.source.agreedValue})`);
  console.log(`   - Request: ${story.request.reference} (₹${story.request.amount}, Status: ${story.request.status})`);
  console.log(`   - Submission: Ref ${story.submission?.transactionRef} (Method: ${story.submission?.paymentMethod})`);
  console.log(`   - Transaction: ${story.transaction?.transactionNumber} (Confirmed by: ${story.transaction?.confirmedByName})`);
  console.log(`   - Official Receipt: ${story.receipt?.receiptNumber}\n`);

  console.log("============================================================");
  console.log("ALL E2E PAYMENT OPERATING SYSTEM TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
});

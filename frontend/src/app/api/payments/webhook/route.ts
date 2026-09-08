import { NextRequest, NextResponse } from "next/server";
import { db, rawDb } from "@/lib/db";
import { createHmac } from "crypto";
import { realtimeHub } from "@/lib/realtime/realtime-hub";
import { enqueueJob } from "@/lib/queue/job-queue.service";

export const dynamic = "force-dynamic";

// Ensure idempotency storage table exists
rawDb.exec(`
  CREATE TABLE IF NOT EXISTS _PaymentWebhookEvents (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    eventType TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSED',
    processedAt INTEGER NOT NULL
  );
`);

/**
 * Verify HMAC signature of the incoming webhook payload.
 */
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    return expected === signature;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") || req.headers.get("stripe-signature") || req.headers.get("x-razorpay-signature");

  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "bos_payment_secret_prod_key_default";

  // Signature verification (in production with secret configured, or dev fallback)
  if (process.env.NODE_ENV === "production" && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ ok: false, message: "Invalid cryptographic signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    eventId,
    provider = "GENERIC_GATEWAY",
    eventType = "payment.succeeded",
    token,
    paymentRequestId,
    amount,
    currency = "INR",
    transactionRef,
    payerEmail,
  } = event;

  if (!eventId) {
    return NextResponse.json({ ok: false, message: "Missing required eventId" }, { status: 400 });
  }

  // 1. Idempotency Check — Prevent duplicate processing
  const existing = rawDb
    .prepare(`SELECT id, status FROM _PaymentWebhookEvents WHERE id = ?`)
    .get(eventId) as { id: string; status: string } | undefined;

  if (existing) {
    return NextResponse.json({ ok: true, message: "Event already processed (idempotent duplicate acknowledged)" });
  }

  // 2. Identify the Payment Request
  const request = await db.paymentRequest.findFirst({
    where: {
      OR: [
        ...(paymentRequestId ? [{ id: paymentRequestId }] : []),
        ...(token ? [{ tokenHash: token }] : []),
      ],
    },
    include: { client: true, project: true, milestone: true },
  });

  if (!request) {
    return NextResponse.json({ ok: false, message: "Target payment request not found" }, { status: 404 });
  }

  // 3. Atomic Database Transaction (Payment state, Transaction record, Audit, and Financial balance)
  const confirmedAmount = Number(amount) || request.amount;
  const confirmedRef = transactionRef || `WH-${Date.now()}`;
  const now = new Date();

  try {
    await db.$transaction(async (tx) => {
      // Record webhook event in idempotency table
      rawDb
        .prepare(`
          INSERT INTO _PaymentWebhookEvents (id, provider, eventType, payload, status, processedAt)
          VALUES (?, ?, ?, ?, 'PROCESSED', ?)
        `)
        .run(eventId, provider, eventType, rawBody, Date.now());

      // Create confirmed payment transaction
      const txnNumber = `TXN-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const txn = await tx.paymentTransaction.create({
        data: {
          transactionNumber: txnNumber,
          clientId: request.clientId,
          projectId: request.projectId,
          requestId: request.id,
          amount: confirmedAmount,
          currency: currency.toUpperCase(),
          allocatedAmount: confirmedAmount,
          paymentMethod: provider,
          reference: confirmedRef,
          confirmedAt: now,
          confirmedByName: `Webhook (${provider})`,
          status: "CONFIRMED",
        },
      });

      // Allocate to milestone / project
      if (request.milestoneId) {
        await tx.paymentAllocation.create({
          data: {
            transactionId: txn.id,
            requestId: request.id,
            milestoneId: request.milestoneId,
            amount: confirmedAmount,
            currency: currency.toUpperCase(),
            allocatedAt: now,
          },
        });
      }

      // Update payment request status
      await tx.paymentRequest.update({
        where: { id: request.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
        },
      });

      // Log financial audit trail
      await tx.financialAuditLog.create({
        data: {
          requestId: request.id,
          actorName: `Webhook (${provider})`,
          action: "PAYMENT_CONFIRMED_WEBHOOK",
          entityType: "TRANSACTION",
          entityId: txn.id,
          reason: `Verified provider webhook confirmation for ${currency} ${confirmedAmount}`,
        },
      });
    });

    // 4. Background Job Dispatch for PDF Receipt & Notification Email
    await enqueueJob({
      type: "RECEIPT_PDF_GENERATION",
      payload: { requestId: request.id, amount: confirmedAmount, currency },
      workspaceId: request.client.workspaceId,
      dedupKey: `receipt_${request.id}`,
    });

    // 5. Broadcast Realtime Updates
    realtimeHub.broadcast(`workspace:${request.client.workspaceId}`, "payment:confirmed", {
      requestId: request.id,
      amount: confirmedAmount,
      clientName: request.client.companyName,
      timestamp: now.toISOString(),
    });

    if (request.tokenHash) {
      realtimeHub.broadcast(`portal:${request.tokenHash}`, "payment:confirmed", {
        status: "CONFIRMED",
        amount: confirmedAmount,
        currency,
        reference: confirmedRef,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Webhook processed successfully. Payment confirmed.",
      requestId: request.id,
    });
  } catch (err: any) {
    console.error("[PaymentWebhook Error]", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to process webhook" }, { status: 500 });
  }
}

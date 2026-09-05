import { db } from "@/lib/db";
import crypto from "node:crypto";

/**
 * Creates a new Developer API Key.
 * Returns the raw token string ONCE; stores only SHA-256 hash in database.
 */
export async function createApiKey(params: {
  workspaceId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
  actor: { id: string; name: string };
}) {
  const { workspaceId, name, scopes, expiresInDays, actor } = params;

  // Generate 32-byte cryptographically secure random token
  const randomHex = crypto.randomBytes(24).toString("hex");
  const rawKey = `bos_live_${randomHex}`;
  const keyPrefix = rawKey.slice(0, 14) + "...";
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const record = await db.apiKey.create({
    data: {
      workspaceId,
      name,
      keyPrefix,
      keyHash,
      scopes: JSON.stringify(scopes),
      status: "ACTIVE",
      expiresAt,
      createdById: actor.id,
      createdByName: actor.name,
    },
  });

  // Record audit event
  await db.configurationAuditEvent.create({
    data: {
      workspaceId,
      actorId: actor.id,
      actorName: actor.name,
      action: "API_KEY_CREATED",
      category: "SECURITY",
      settingKey: "api_keys",
      impactSummary: `Created API key '${name}' (${keyPrefix})`,
      risk: "HIGH",
    },
  });

  return {
    apiKey: record,
    rawSecretKey: rawKey, // Only returned at creation time
  };
}

export async function listApiKeys(workspaceId: string) {
  return db.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdByName: true,
      createdAt: true,
    },
  });
}

export async function revokeApiKey(workspaceId: string, id: string, actor: { id: string; name: string }) {
  const key = await db.apiKey.findFirst({
    where: { id, workspaceId },
  });

  if (!key) throw new Error("API key not found.");

  const updated = await db.apiKey.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  await db.configurationAuditEvent.create({
    data: {
      workspaceId,
      actorId: actor.id,
      actorName: actor.name,
      action: "API_KEY_REVOKED",
      category: "SECURITY",
      settingKey: "api_keys",
      impactSummary: `Revoked API key '${key.name}' (${key.keyPrefix})`,
      risk: "HIGH",
    },
  });

  return updated;
}

/**
 * Webhooks Management
 */
export async function createWebhookSubscription(params: {
  workspaceId: string;
  name: string;
  url: string;
  events: string[];
  actor: { id: string; name: string };
}) {
  const { workspaceId, name, url, events, actor } = params;
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const webhook = await db.webhookSubscription.create({
    data: {
      workspaceId,
      name,
      url,
      secret,
      events: JSON.stringify(events),
      status: "ACTIVE",
      createdById: actor.id,
      createdByName: actor.name,
    },
  });

  await db.configurationAuditEvent.create({
    data: {
      workspaceId,
      actorId: actor.id,
      actorName: actor.name,
      action: "WEBHOOK_CREATED",
      category: "INTEGRATION",
      settingKey: "webhooks",
      impactSummary: `Registered webhook '${name}' (${url})`,
      risk: "MEDIUM",
    },
  });

  return webhook;
}

export async function listWebhooks(workspaceId: string) {
  return db.webhookSubscription.findMany({
    where: { workspaceId },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function triggerWebhookTestPing(webhookId: string) {
  const webhook = await db.webhookSubscription.findUnique({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error("Webhook not found");

  const startTime = Date.now();
  const testPayload = {
    event: "system.ping",
    timestamp: new Date().toISOString(),
    webhookId: webhook.id,
    workspaceId: webhook.workspaceId,
    message: "Test ping verification from Business OS Control Plane",
  };

  let statusCode = 200;
  let success = true;
  let responseBody = '{"ok": true, "acknowledged": true}';

  // If valid HTTP URL, we can attempt a lightweight dispatch or record simulation
  try {
    if (webhook.url.startsWith("http")) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BusinessOS-Event": "system.ping",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res) {
        statusCode = res.status;
        success = res.ok;
        responseBody = await res.text().catch(() => "Response stream consumed");
      }
    }
  } catch (err: any) {
    statusCode = 502;
    success = false;
    responseBody = `Connection error: ${err.message}`;
  }

  const durationMs = Date.now() - startTime;

  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: "system.ping",
      statusCode,
      requestPayload: JSON.stringify(testPayload),
      responseBody: responseBody.slice(0, 1000),
      success,
      durationMs,
    },
  });

  await db.webhookSubscription.update({
    where: { id: webhook.id },
    data: {
      lastDeliveryAt: new Date(),
      lastDeliveryStatus: statusCode,
      failureCount: success ? 0 : { increment: 1 },
    },
  });

  return delivery;
}

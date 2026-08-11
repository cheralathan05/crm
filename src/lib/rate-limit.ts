import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}

async function clientKey(): Promise<string> {
  return clientIp();
}

/**
 * Opportunistically bound the size of the in-memory bucket map. Expired
 * entries are deleted once the map grows past a threshold, so credential-
 * stuffing-style attacks cannot grow memory without bound.
 */
function pruneExpired(now: number) {
  if (buckets.size < 1_000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * In-memory rate limiter.
 *
 * Each call site passes a `scope` (e.g. "signup", "login", "forgot-password")
 * so every endpoint gets its own bucket per client. Without a scope, all
 * endpoints would share one bucket and a burst on one route (signup) would
 * 429 an unrelated route (forgot-password).
 *
 * ⚠️ DEVELOPMENT-GRADE: Uses a local Map that resets on server restart
 * and does NOT synchronize across instances. For production, replace
 * with a Redis-based limiter or database-backed implementation.
 */
export async function rateLimit(
  limit: number,
  windowMs: number,
  scope = "default",
): Promise<{
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
}> {
  const client = await clientKey();
  return rateLimitByKey(`${client}:${scope}`, limit, windowMs);
}

/**
 * Bucket addressed by an explicit key — used for per-account limits such as
 * failed-login lockout (key = `failed-login:<email>`).
 */
export function rateLimitByKey(
  key: string,
  limit: number,
  windowMs: number,
): {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
} {
  const now = Date.now();
  pruneExpired(now);
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0, remaining: limit - entry.count };
}

/** Remove a bucket (e.g. reset the failed-login counter after a success). */
export function clearRateLimit(key: string) {
  buckets.delete(key);
}
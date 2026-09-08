import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const RATE_LIMIT_TIERS = {
  AUTH: { limit: 5, windowMs: 60_000 },
  OTP: { limit: 3, windowMs: 300_000 },
  PAYMENT: { limit: 10, windowMs: 60_000 },
  AI: { limit: 20, windowMs: 60_000 },
  UPLOAD: { limit: 10, windowMs: 60_000 },
  SEARCH: { limit: 40, windowMs: 60_000 },
  PUBLIC: { limit: 60, windowMs: 60_000 },
  AUTHENTICATED_API: { limit: 300, windowMs: 60_000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "local"
    );
  } catch {
    return "local";
  }
}

async function clientKey(): Promise<string> {
  return clientIp();
}

/**
 * Opportunistically prune expired rate-limit buckets to preserve memory.
 */
function pruneExpired(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * In-memory rate limiter with tier support.
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
 * Check rate limit by defined tier.
 */
export async function checkRateLimitByTier(
  tier: RateLimitTier,
  customScope?: string
): Promise<{
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
}> {
  const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.AUTHENTICATED_API;
  return rateLimit(config.limit, config.windowMs, customScope ?? tier.toLowerCase());
}

/**
 * Bucket addressed by an explicit key — used for per-account or per-token limits.
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

/** Remove a bucket after successful authentication. */
export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function getRateLimiterMetrics() {
  return {
    activeBuckets: buckets.size,
  };
}
/**
 * Simple in-memory rate limiter (token bucket).
 *
 * For multi-instance / serverless deployments this needs to graduate to a
 * shared store (Upstash Redis, Cloudflare KV). See `docs/deploy-checklist.md`.
 */

/**
 * Resolve the client IP from the request.
 *
 * Trust order matches what Vercel and most reverse proxies expose:
 *  1. `x-vercel-forwarded-for` (Vercel sets this and rewrites x-forwarded-for)
 *  2. `cf-connecting-ip` (Cloudflare)
 *  3. `x-real-ip` (NGINX-style — typically only set by trusted proxy)
 *  4. The *last* hop in `x-forwarded-for` — that's the IP added by the
 *     trusted proxy itself. Reading the *first* hop is the historical
 *     mistake: an attacker can prepend any value via XFF and fragment
 *     buckets to bypass per-IP limits.
 *
 * Falls back to "unknown" so callers always get a non-empty bucket key.
 */
export function getClientIP(req: Request): string {
  const direct =
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip");
  if (direct && direct.length > 0) return direct.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  return "unknown";
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Cap bucket count to avoid an unbounded Map on long-lived processes.
// When we exceed this we drop the oldest entries — they would have been
// refilled to full anyway on next access.
const MAX_BUCKETS = 10_000;

function getKey(identifier: string, path: string): string {
  return `${identifier}:${path}`;
}

function evictIfNeeded(): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const dropCount = buckets.size - MAX_BUCKETS + Math.floor(MAX_BUCKETS * 0.1);
  let i = 0;
  for (const key of buckets.keys()) {
    if (i++ >= dropCount) break;
    buckets.delete(key);
  }
}

export function checkRateLimit(
  identifier: string,
  path: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = getKey(identifier, path);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    evictIfNeeded();
    buckets.set(key, { tokens: config.maxRequests - 1, lastRefill: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  const elapsed = now - bucket.lastRefill;
  const refillTokens = Math.floor((elapsed / config.windowMs) * config.maxRequests);

  if (refillTokens > 0) {
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + refillTokens);
    // Advance lastRefill by exactly the time those tokens consumed, instead
    // of jumping to `now`. The old code stranded the sub-quantum remainder.
    const consumedMs = (refillTokens / config.maxRequests) * config.windowMs;
    bucket.lastRefill += consumedMs;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetAt: now + config.windowMs,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: bucket.lastRefill + config.windowMs,
  };
}

/** Test-only: reset shared state. Avoid using outside tests. */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}

// Default configs for critical endpoints.
export const rateLimitConfigs = {
  auth: { windowMs: 60_000, maxRequests: 5 }, // 5 per minute
  upload: { windowMs: 60_000, maxRequests: 3 }, // 3 per minute
  checkout: { windowMs: 60_000, maxRequests: 10 }, // 10 per minute
  api: { windowMs: 60_000, maxRequests: 60 }, // 60 per minute
} as const;

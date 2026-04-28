/**
 * Simple in-memory rate limiter (token bucket).
 * For production with multiple instances, replace with Redis (e.g. Upstash).
 */

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
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

function getKey(identifier: string, path: string): string {
  return `${identifier}:${path}`;
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
    bucket.lastRefill = now;
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

// Default configs for critical endpoints
export const rateLimitConfigs = {
  auth: { windowMs: 60_000, maxRequests: 5 }, // 5 per minute
  upload: { windowMs: 60_000, maxRequests: 3 }, // 3 per minute
  checkout: { windowMs: 60_000, maxRequests: 10 }, // 10 per minute
  api: { windowMs: 60_000, maxRequests: 60 }, // 60 per minute
} as const;

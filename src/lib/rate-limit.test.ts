import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  getClientIP,
  _resetRateLimitForTests,
} from "./rate-limit";

function makeReq(headers: Record<string, string>): Request {
  return new Request("https://x.test/", { headers });
}

describe("getClientIP", () => {
  it("prefers vercel-forwarded-for", () => {
    expect(
      getClientIP(
        makeReq({
          "x-vercel-forwarded-for": "203.0.113.1",
          "x-forwarded-for": "1.2.3.4",
        }),
      ),
    ).toBe("203.0.113.1");
  });

  it("falls back to cf-connecting-ip", () => {
    expect(
      getClientIP(
        makeReq({
          "cf-connecting-ip": "203.0.113.2",
          "x-forwarded-for": "1.2.3.4",
        }),
      ),
    ).toBe("203.0.113.2");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIP(makeReq({ "x-real-ip": "203.0.113.3" }))).toBe(
      "203.0.113.3",
    );
  });

  it("uses the last hop of x-forwarded-for, not the first", () => {
    // An attacker can prepend any value to XFF; the trusted proxy appends
    // the real client IP at the end. Reading the first hop lets the
    // attacker fragment buckets and bypass per-IP limits.
    expect(
      getClientIP(makeReq({ "x-forwarded-for": "evil-spoof, 198.51.100.7" })),
    ).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no header is present", () => {
    expect(getClientIP(makeReq({}))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimitForTests());

  it("allows up to maxRequests then denies", () => {
    const cfg = { windowMs: 60_000, maxRequests: 3 };
    expect(checkRateLimit("ip1", "/p", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip1", "/p", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip1", "/p", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip1", "/p", cfg).allowed).toBe(false);
  });

  it("buckets per identifier+path", () => {
    const cfg = { windowMs: 60_000, maxRequests: 1 };
    expect(checkRateLimit("a", "/p", cfg).allowed).toBe(true);
    // Different identifier — fresh bucket.
    expect(checkRateLimit("b", "/p", cfg).allowed).toBe(true);
    // Different path on same identifier — fresh bucket.
    expect(checkRateLimit("a", "/q", cfg).allowed).toBe(true);
  });
});

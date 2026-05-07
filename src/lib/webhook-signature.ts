import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a webhook body against an HMAC-SHA256 signature.
 *
 * Matches Bunny Stream's native scheme: header `X-BunnyStream-Signature`
 * carries the lowercase hex digest of HMAC-SHA256(rawBody, readOnlyApiKey).
 * Constant-time comparison.
 */
export function verifyHmacSha256(
  rawBody: string | Uint8Array,
  signatureHex: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHex || signatureHex.length === 0) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHex.trim().toLowerCase(), "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function signHmacSha256(
  rawBody: string | Uint8Array,
  secret: string,
): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

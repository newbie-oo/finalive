import "server-only";
import { and, eq, lt } from "drizzle-orm";
import type { ZodType } from "zod";
import { db } from "@/db/client";
import { idempotencyRecord } from "@/db/schema/idempotency";
import { isUniqueViolation } from "@/lib/pg-error";

export interface WithIdempotencyArgs<T> {
  scope: string;
  key: string;
  schema: ZodType<T>;
  ttlMs?: number;
  run: () => Promise<T>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const ENVELOPE_VERSION = 1;
const POLL_MS = 100;
const POLL_TIMEOUT_MS = 30_000;

interface Envelope {
  v: number;
  data: unknown;
}

/**
 * Race-free idempotency.
 *
 * 1. INSERT a placeholder row (response_json={ v:1, data:null }) up-front.
 *    - If the insert wins, this caller owns the operation: run() then UPDATE.
 *    - If the insert loses on the (scope, key) PK, another caller is in
 *      flight (or already finished). Poll until the row's data is non-null,
 *      then return the cached response (validated against schema so a stale
 *      cache from a prior code version is rejected loudly).
 *
 * Without the eager insert, two concurrent requests would both miss the
 * SELECT, both run() (uploading two R2 blobs, sending two emails, ...),
 * and only the second INSERT would no-op — the second caller would still
 * return its own freshly-computed response. See code-reviewer C2.
 */
export async function withIdempotency<T>(
  args: WithIdempotencyArgs<T>,
): Promise<T> {
  const ttlMs = args.ttlMs ?? DEFAULT_TTL_MS;

  // Race step 1: try to acquire the lease.
  const acquired = await tryAcquire(args.scope, args.key, ttlMs);

  if (acquired) {
    // We won the lease — actually run the operation, then store the response.
    try {
      const result = await args.run();
      await db
        .update(idempotencyRecord)
        .set({
          responseJson: envelope(result),
          expiresAt: new Date(Date.now() + ttlMs),
        })
        .where(
          and(
            eq(idempotencyRecord.scope, args.scope),
            eq(idempotencyRecord.key, args.key),
          ),
        );
      return result;
    } catch (err) {
      // Don't leave a placeholder behind — let a retry try fresh.
      await db
        .delete(idempotencyRecord)
        .where(
          and(
            eq(idempotencyRecord.scope, args.scope),
            eq(idempotencyRecord.key, args.key),
          ),
        );
      throw err;
    }
  }

  // Lost the race — poll for the winner's response.
  return pollForResult(args.scope, args.key, args.schema);
}

async function tryAcquire(
  scope: string,
  key: string,
  ttlMs: number,
): Promise<boolean> {
  try {
    const inserted = await db
      .insert(idempotencyRecord)
      .values({
        scope,
        key,
        responseJson: { v: ENVELOPE_VERSION, data: null } satisfies Envelope,
        expiresAt: new Date(Date.now() + ttlMs),
      })
      .onConflictDoNothing({
        target: [idempotencyRecord.scope, idempotencyRecord.key],
      })
      .returning({ scope: idempotencyRecord.scope });
    return inserted.length === 1;
  } catch (e) {
    // Treat unique-violation as 'lost the race' even if the dialect happens
    // to throw before the ON CONFLICT can fire.
    if (isUniqueViolation(e)) return false;
    throw e;
  }
}

async function pollForResult<T>(
  scope: string,
  key: string,
  schema: ZodType<T>,
): Promise<T> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const rows = await db
      .select({ responseJson: idempotencyRecord.responseJson })
      .from(idempotencyRecord)
      .where(
        and(eq(idempotencyRecord.scope, scope), eq(idempotencyRecord.key, key)),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      // The placeholder was rolled back / cleared (winner crashed). Caller
      // can retry; surface as a transient conflict.
      throw new Error("idempotency: lease holder vanished — retry");
    }
    const env = parseEnvelope(row.responseJson);
    if (env.data !== null && env.data !== undefined) {
      return schema.parse(env.data);
    }
    await sleep(POLL_MS);
  }
  throw new Error("idempotency: timed out waiting for in-flight result");
}

function envelope<T>(data: T): Envelope {
  return { v: ENVELOPE_VERSION, data };
}

function parseEnvelope(raw: unknown): Envelope {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("v" in raw) ||
    !("data" in raw) ||
    (raw as { v: unknown }).v !== ENVELOPE_VERSION
  ) {
    throw new Error(`idempotency: stored envelope has unexpected shape`);
  }
  return raw as Envelope;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function cleanupExpiredIdempotency(): Promise<number> {
  const rows = await db
    .delete(idempotencyRecord)
    .where(lt(idempotencyRecord.expiresAt, new Date()))
    .returning({ scope: idempotencyRecord.scope });
  return rows.length;
}

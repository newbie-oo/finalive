import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { idempotencyRecord } from "@/db/schema/idempotency";

export interface WithIdempotencyArgs<T> {
  scope: string;
  key: string;
  ttlMs?: number; // default 24h
  run: () => Promise<T>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// JSON cast at the boundary; T is whatever the caller hands in.
function readResponse<T>(raw: unknown): T {
  return raw as T;
}

export async function withIdempotency<T>(args: WithIdempotencyArgs<T>): Promise<T> {
  const existing = await db
    .select({ responseJson: idempotencyRecord.responseJson })
    .from(idempotencyRecord)
    .where(
      and(eq(idempotencyRecord.scope, args.scope), eq(idempotencyRecord.key, args.key)),
    )
    .limit(1);
  if (existing[0]) return readResponse<T>(existing[0].responseJson);

  const result = await args.run();
  const ttlMs = args.ttlMs ?? DEFAULT_TTL_MS;
  await db
    .insert(idempotencyRecord)
    .values({
      scope: args.scope,
      key: args.key,
      responseJson: result as unknown as object,
      expiresAt: new Date(Date.now() + ttlMs),
    })
    .onConflictDoNothing({ target: [idempotencyRecord.scope, idempotencyRecord.key] });
  return result;
}

export async function cleanupExpiredIdempotency(): Promise<number> {
  const rows = await db
    .delete(idempotencyRecord)
    .where(lt(idempotencyRecord.expiresAt, new Date()))
    .returning({ scope: idempotencyRecord.scope });
  return rows.length;
}

import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { db } from "@/db/client";
import { idempotencyRecord } from "@/db/schema/idempotency";
import { isUniqueViolation } from "@/lib/pg-error";

const ENVELOPE_VERSION = 1;
const POLL_MS = 100;
const POLL_TIMEOUT_MS = 30_000;
// Leases with no committed result older than this are considered abandoned
// (the original holder crashed). The next caller breaks the lease and retries.
const LEASE_STALE_AFTER_MS = 60_000;

interface Envelope {
	v: number;
	data: unknown;
}

export interface WithIdempotencyArgs<T> {
	scope: string;
	key: string;
	schema: ZodType<T>;
	run: () => Promise<T>;
}

export async function withIdempotency<T>(
	args: WithIdempotencyArgs<T>,
): Promise<T> {
	let acquired = await tryAcquire(args.scope, args.key);

	// If insert was blocked, the row may be stale (holder crashed before commit).
	// Break-on-stale and retry once.
	if (!acquired) {
		const broke = await breakIfStale(args.scope, args.key);
		if (broke) {
			acquired = await tryAcquire(args.scope, args.key);
		}
	}

	if (acquired) {
		try {
			const result = await args.run();
			await db
				.update(idempotencyRecord)
				.set({
					responseJson: envelope(result),
				})
				.where(
					and(
						eq(idempotencyRecord.scope, args.scope),
						eq(idempotencyRecord.key, args.key),
					),
				);
			return result;
		} catch (err) {
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

	return pollForResult(args.scope, args.key, args.schema);
}

// If a row exists with no committed result and is older than the stale
// threshold, the original lease holder crashed. Delete it so the next
// caller can retry. Returns true when a stale row was deleted.
async function breakIfStale(scope: string, key: string): Promise<boolean> {
	const deleted = await db
		.delete(idempotencyRecord)
		.where(
			and(
				eq(idempotencyRecord.scope, scope),
				eq(idempotencyRecord.key, key),
				sql`${idempotencyRecord.responseJson} ->> 'data' IS NULL`,
				sql`${idempotencyRecord.createdAt} < NOW() - (${LEASE_STALE_AFTER_MS}::int * interval '1 millisecond')`,
			),
		)
		.returning({ scope: idempotencyRecord.scope });
	return deleted.length > 0;
}

async function tryAcquire(scope: string, key: string): Promise<boolean> {
	try {
		const inserted = await db
			.insert(idempotencyRecord)
			.values({
				scope,
				key,
				responseJson: { v: ENVELOPE_VERSION, data: null } satisfies Envelope,
			})
			.onConflictDoNothing({
				target: [idempotencyRecord.scope, idempotencyRecord.key],
			})
			.returning({ scope: idempotencyRecord.scope });
		return inserted.length === 1;
	} catch (e) {
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
			// Lease was broken (holder crashed and another caller deleted the
			// stale row). Surface a transient error so the caller can retry.
			throw new Error("idempotency_lease_broken");
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

interface FakeRow {
	scope: string;
	key: string;
	responseJson: unknown;
}

let store: FakeRow[] = [];

vi.mock("@/db/client", () => {
	function whereMatches(scope: string, key: string) {
		return (row: FakeRow) => row.scope === scope && row.key === key;
	}

	const insert = vi.fn(() => ({
		values: (row: FakeRow) => ({
			onConflictDoNothing: () => ({
				returning: async () => {
					if (store.some(whereMatches(row.scope, row.key))) return [];
					store.push(row);
					return [{ scope: row.scope }];
				},
			}),
		}),
	}));

	function deletedRows(predicate: {
		scope: string;
		key: string;
		hasStaleClause?: boolean;
	}): FakeRow[] {
		// Tests configure no stale rows, so any breakIfStale call is a no-op.
		if (predicate.hasStaleClause) return [];
		const matched = store.filter(
			(r) => r.scope === predicate.scope && r.key === predicate.key,
		);
		store = store.filter(
			(r) => !(r.scope === predicate.scope && r.key === predicate.key),
		);
		return matched;
	}

	const del = vi.fn(() => ({
		where: (predicate: {
			scope: string;
			key: string;
			hasStaleClause?: boolean;
		}) => {
			let materialised: FakeRow[] | undefined;
			const ensure = () => {
				if (!materialised) materialised = deletedRows(predicate);
				return materialised;
			};
			const thenable = {
				then: (
					resolve: (value: undefined) => void,
					reject?: (reason: unknown) => void,
				) => {
					try {
						ensure();
						resolve(undefined);
					} catch (err) {
						reject?.(err);
					}
				},
				returning: async () => ensure(),
			};
			return thenable;
		},
	}));

	const select = vi.fn(() => ({
		from: () => ({
			where: (predicate: { scope: string; key: string }) => ({
				limit: async () =>
					store.filter(
						(r) =>
							r.scope === predicate.scope && r.key === predicate.key,
					),
			}),
		}),
	}));

	const update = vi.fn(() => ({
		set: (patch: { responseJson: unknown }) => ({
			where: async (predicate: { scope: string; key: string }) => {
				for (const row of store) {
					if (
						row.scope === predicate.scope &&
						row.key === predicate.key
					) {
						row.responseJson = patch.responseJson;
					}
				}
			},
		}),
	}));

	return { db: { insert, update, delete: del, select } };
});

vi.mock("@/lib/pg-error", () => ({
	isUniqueViolation: () => false,
}));

vi.mock("drizzle-orm", () => {
	type Predicate = {
		scope: string;
		key: string;
		hasStaleClause?: boolean;
	};
	const eq = (col: { name: string }, val: string) => ({
		_eq: true,
		col: col.name,
		val,
	});
	const and = (...parts: unknown[]) => {
		const out: Partial<Predicate> = {};
		for (const p of parts) {
			if (p && typeof p === "object") {
				if ("col" in p && "val" in p) {
					const e = p as { col: string; val: string };
					if (e.col === "scope") out.scope = e.val;
					if (e.col === "key") out.key = e.val;
				}
				if ("_sql" in p) {
					out.hasStaleClause = true;
				}
			}
		}
		return out as Predicate;
	};
	const sql = (..._args: unknown[]) => ({ _sql: true });
	return { and, eq, sql };
});

vi.mock("@/db/schema/idempotency", () => ({
	idempotencyRecord: {
		scope: { name: "scope" },
		key: { name: "key" },
		responseJson: { name: "responseJson" },
		createdAt: { name: "createdAt" },
	},
}));

const { withIdempotency } = await import("./idempotency");

const schema = z.object({ id: z.string() });

describe("withIdempotency", () => {
	beforeEach(() => {
		store = [];
		vi.clearAllMocks();
	});

	it("acquires the lease, runs the action, and stores the committed result", async () => {
		const run = vi.fn().mockResolvedValue({ id: "abc" });

		const result = await withIdempotency({
			scope: "slip:upload",
			key: "k1",
			schema,
			run,
		});

		expect(result).toEqual({ id: "abc" });
		expect(run).toHaveBeenCalledTimes(1);
		expect(store).toHaveLength(1);
		expect(store[0]).toMatchObject({
			scope: "slip:upload",
			key: "k1",
			responseJson: { v: 1, data: { id: "abc" } },
		});
	});

	it("does not re-run when the lease was acquired previously and committed", async () => {
		const run = vi.fn().mockResolvedValue({ id: "first" });
		await withIdempotency({
			scope: "slip:upload",
			key: "k1",
			schema,
			run,
		});

		// Same key → tryAcquire returns false (row exists), pollForResult sees
		// committed envelope and returns the stored value.
		const run2 = vi.fn().mockResolvedValue({ id: "second" });
		const result = await withIdempotency({
			scope: "slip:upload",
			key: "k1",
			schema,
			run: run2,
		});

		expect(result).toEqual({ id: "first" });
		expect(run2).not.toHaveBeenCalled();
	});

	it("removes the lease row when the action throws so the next caller can retry", async () => {
		const run = vi.fn().mockRejectedValue(new Error("boom"));

		await expect(
			withIdempotency({ scope: "slip:upload", key: "k2", schema, run }),
		).rejects.toThrow("boom");
		expect(store.find((r) => r.key === "k2")).toBeUndefined();
	});
});

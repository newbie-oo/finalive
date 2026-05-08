/**
 * Centralised TanStack Query keys.
 *
 * Defining keys here avoids two classes of bugs:
 *   1. Typos in literals fragment the cache (`["admin-slip"]` vs `["admin-slips"]`)
 *      so an invalidation never reaches the consumer.
 *   2. Two callers passing different shapes for the same logical entity
 *      (`["admin-slips", status]` vs `["admin-slips", { status }]`) produce
 *      separate caches and partial invalidations.
 *
 * Convention: each entry returns a fresh array so callers cannot accidentally
 * mutate a shared reference.
 */

export const queryKeys = {
	adminSlips: {
		/** Root key — pass to `invalidateQueries` to drop every slip-list cache. */
		all: () => ["admin-slips"] as const,
		/** Per-status slip queue. */
		byStatus: (status: string) => ["admin-slips", status] as const,
	},
	slipImageUrl: (slipId: string) => ["slip-image-url", slipId] as const,
	pendingStatus: (pendingId: string) =>
		["pending-status", pendingId] as const,
} as const;

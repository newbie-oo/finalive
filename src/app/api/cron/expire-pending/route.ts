import { sql, lt, and } from "drizzle-orm";
import { db } from "@/db/client";
import { pendingEnrollment } from "@/db/schema/payment";
import { auditLog } from "@/db/schema/audit";
import { cronRoute } from "@/lib/cron-route";

const ADVISORY_LOCK_ID = 9001;
const EXPIRABLE_STATUSES = ["awaiting_payment", "slip_submitted"];

export const POST = cronRoute({
	handler: async () => {
		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`);

			const now = new Date();

			const expiredRows = await tx
				.select({ id: pendingEnrollment.id })
				.from(pendingEnrollment)
				.where(
					and(
						sql`${pendingEnrollment.status} IN ${sql.raw("('" + EXPIRABLE_STATUSES.join("','") + "')")}`,
						lt(pendingEnrollment.expiresAt, now),
					),
				);

			if (expiredRows.length === 0) {
				return { expired: 0 };
			}

			const ids = expiredRows.map((r) => r.id);

			await tx
				.update(pendingEnrollment)
				.set({ status: "expired", updatedAt: now })
				.where(
					sql`${pendingEnrollment.id} IN ${sql.raw("('" + ids.join("','") + "')")}`,
				);

			await tx.insert(auditLog).values({
				actorType: "cron",
				action: "pending_enrollment.expired_batch",
				targetType: "pending_enrollment",
				targetId: ids[0] ?? "batch",
				beforeJson: { count: expiredRows.length, ids },
				afterJson: { status: "expired" },
			});

			return { expired: expiredRows.length };
		});

		return { ok: true, expired: result.expired };
	},
});

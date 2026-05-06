import { sql, lt, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import { cronRoute } from "@/lib/cron-route";
import { dispatchEmail } from "@/server/email/dispatch";

const ADVISORY_LOCK_ID = 9002;
const MAX_ATTEMPTS = 3;

export const POST = cronRoute({
	handler: async () => {
		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`);

			const pendingRows = await tx
				.select({
					id: emailMessage.id,
					toEmail: emailMessage.toEmail,
					template: emailMessage.template,
					paramsJson: emailMessage.paramsJson,
					attempts: emailMessage.attempts,
					status: emailMessage.status,
				})
				.from(emailMessage)
				.where(
					and(
						inArray(emailMessage.status, ["queued", "failed"]),
						lt(emailMessage.attempts, MAX_ATTEMPTS),
					),
				)
				.limit(50);

			let retried = 0;
			let succeeded = 0;

			for (const row of pendingRows) {
				retried++;
				try {
					await dispatchEmail(
						row.template,
						row.toEmail,
						(row.paramsJson as Record<string, unknown>) ?? {},
					);
					await tx
						.update(emailMessage)
						.set({
							status: "sent",
							attempts: (row.attempts ?? 0) + 1,
							sentAt: new Date(),
							lastAttemptAt: new Date(),
							lastError: null,
						})
						.where(sql`${emailMessage.id} = ${row.id}`);
					succeeded++;
				} catch (err) {
					const nextAttempts = (row.attempts ?? 0) + 1;
					await tx
						.update(emailMessage)
						.set({
							status: "failed",
							attempts: nextAttempts,
							lastAttemptAt: new Date(),
							lastError: err instanceof Error ? err.message : String(err),
						})
						.where(sql`${emailMessage.id} = ${row.id}`);
				}
			}

			return { retried, succeeded };
		});

		return { ok: true, retried: result.retried, succeeded: result.succeeded };
	},
});

import "server-only";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import { dispatchEmail } from "@/server/email/dispatch";
import type { EmailPayload } from "@/server/email/templates";
import { logger } from "@/lib/logger";

/** Runtime template names (kept for DB-layer compatibility). */
export type EmailTemplate = EmailPayload["template"];

export type EmailQueueWriter = Pick<typeof db, "insert">;

/**
 * Send an email immediately via nodemailer, then record the outcome.
 *
 * On success: inserts an audit row with status='sent'.
 * On send failure: inserts a row with status='failed' for debugging/audit.
 * Send failures do NOT throw — callers treat email as best-effort.
 * DB insert failures DO throw (programmer error / DB down).
 */
export async function sendEmail(
	writer: EmailQueueWriter,
	toEmail: string,
	payload: EmailPayload,
	userId?: string | null,
): Promise<string> {
	const now = new Date();
	let status: "sent" | "failed" = "sent";
	let lastError: string | null = null;
	let sentAt: Date | null = now;

	try {
		await dispatchEmail(
			payload.template,
			toEmail,
			payload.params as unknown as Record<string, unknown>,
		);
	} catch (err) {
		status = "failed";
		sentAt = null;
		lastError = err instanceof Error ? err.message : String(err);
		logger.error("email.send_failed", err, {
			template: payload.template,
			toEmail,
			userId: userId ?? undefined,
		});
	}

	const [row] = await writer
		.insert(emailMessage)
		.values({
			toEmail,
			template: payload.template,
			paramsJson: payload.params,
			userId: userId ?? null,
			status,
			attempts: 1,
			lastAttemptAt: now,
			sentAt,
			lastError,
		})
		.returning({ id: emailMessage.id });
	if (!row) throw new Error("sendEmail: insert returned no rows");
	return row.id;
}

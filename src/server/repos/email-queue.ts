import "server-only";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import { dispatchEmail } from "@/server/email/template-registry";
import "@/server/email/register-all";

export interface EmailPayload {
	template: string;
	params: Record<string, unknown>;
}
import { logger } from "@/lib/logger";

/** Runtime template names (kept for DB-layer compatibility). */
export type EmailTemplate = EmailPayload["template"];

export type EmailQueueWriter = Pick<typeof db, "insert">;

/** Repository seam for recording email outcomes. Keeps sendEmail testable
 *  without a real Drizzle client. */
export interface EmailQueueRepo {
	recordEmail(input: {
		toEmail: string;
		template: EmailTemplate;
		paramsJson: unknown;
		userId: string | null;
		status: "sent" | "failed";
		attempts: number;
		lastAttemptAt: Date;
		sentAt: Date | null;
		lastError: string | null;
	}): Promise<{ id: string }>;
}

/** Real adapter backed by Drizzle. */
export function makeDbEmailQueueRepo(): EmailQueueRepo {
	return {
		async recordEmail(input) {
			const [row] = await db
				.insert(emailMessage)
				.values({
					toEmail: input.toEmail,
					template: input.template,
					paramsJson: input.paramsJson,
					userId: input.userId,
					status: input.status,
					attempts: input.attempts,
					lastAttemptAt: input.lastAttemptAt,
					sentAt: input.sentAt,
					lastError: input.lastError,
				})
				.returning({ id: emailMessage.id });
			if (!row) throw new Error("sendEmail: insert returned no rows");
			return { id: row.id };
		},
	};
}

/**
 * Send an email immediately via nodemailer, then record the outcome.
 *
 * On success: inserts an audit row with status='sent'.
 * On send failure: inserts a row with status='failed' for debugging/audit.
 * Send failures do NOT throw — callers treat email as best-effort.
 * DB insert failures DO throw (programmer error / DB down).
 */
export async function sendEmail(
	repo: EmailQueueRepo,
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

	const row = await repo.recordEmail({
		toEmail,
		template: payload.template,
		paramsJson: payload.params,
		userId: userId ?? null,
		status,
		attempts: 1,
		lastAttemptAt: now,
		sentAt,
		lastError,
	});
	return row.id;
}

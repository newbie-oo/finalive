import "server-only";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import type { EmailPayload } from "@/server/email/templates";

/** Runtime template names (kept for DB-layer compatibility). */
export type EmailTemplate = EmailPayload["template"];

export type EmailQueueWriter = Pick<typeof db, "insert">;

/**
 * Enqueue a type-safe templated email. The payload is serialized to JSON
 * before storage; the dispatcher reads it back and renders the React email.
 */
export async function enqueueEmail(
	writer: EmailQueueWriter,
	toEmail: string,
	payload: EmailPayload,
	userId?: string | null,
): Promise<string> {
	const [row] = await writer
		.insert(emailMessage)
		.values({
			toEmail,
			template: payload.template,
			paramsJson: payload.params,
			userId: userId ?? null,
			status: "queued",
		})
		.returning({ id: emailMessage.id });
	if (!row) throw new Error("enqueueEmail: insert returned no rows");
	return row.id;
}

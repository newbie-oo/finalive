import "server-only";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import type { EmailPayload } from "@/server/email/templates";

type DbWriter = Pick<typeof db, "insert">;

/** Runtime template names (kept for DB-layer compatibility). */
export type EmailTemplate = EmailPayload["template"];

/**
 * Enqueue a type-safe templated email. The payload is serialized to JSON
 * before storage; the dispatcher reads it back and renders the React email.
 */
export async function enqueueEmail(
	toEmail: string,
	payload: EmailPayload,
	userId?: string | null,
	tx?: DbWriter,
): Promise<string> {
	const writer = tx ?? db;
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

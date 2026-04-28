import "server-only";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";

export type EmailTemplate =
  | "verify_email"
  | "password_reset"
  | "slip_received"
  | "admin_new_slip"
  | "slip_accepted"
  | "slip_rejected"
  | "course_granted"
  | "course_completed";

export interface EnqueueArgs {
  toEmail: string;
  template: EmailTemplate;
  paramsJson: Record<string, unknown>;
  userId?: string | null;
}

export async function enqueueEmail(
  args: EnqueueArgs,
  tx?: PgTransaction<never, never, never>,
): Promise<string> {
  const writer = tx ?? db;
  const [row] = await writer
    .insert(emailMessage)
    .values({
      toEmail: args.toEmail,
      template: args.template,
      paramsJson: args.paramsJson,
      userId: args.userId ?? null,
      status: "queued",
    })
    .returning({ id: emailMessage.id });
  if (!row) throw new Error("enqueueEmail: insert returned no rows");
  return row.id;
}

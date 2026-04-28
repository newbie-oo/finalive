import { NextResponse } from "next/server";
import { sql, lt, and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import { verifyCronSecret } from "@/lib/cron-auth";
import { dispatchEmail } from "@/server/email/dispatch";

const ADVISORY_LOCK_ID = 9002;
const MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_ID})`);

    const failedRows = await tx
      .select({
        id: emailMessage.id,
        toEmail: emailMessage.toEmail,
        template: emailMessage.template,
        paramsJson: emailMessage.paramsJson,
        attempts: emailMessage.attempts,
      })
      .from(emailMessage)
      .where(
        and(
          eq(emailMessage.status, "failed"),
          lt(emailMessage.attempts, MAX_ATTEMPTS),
        ),
      )
      .limit(50);

    let retried = 0;
    let succeeded = 0;

    for (const row of failedRows) {
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
          .where(eq(emailMessage.id, row.id));
        succeeded++;
      } catch (err) {
        await tx
          .update(emailMessage)
          .set({
            attempts: (row.attempts ?? 0) + 1,
            lastAttemptAt: new Date(),
            lastError: err instanceof Error ? err.message : String(err),
          })
          .where(eq(emailMessage.id, row.id));
      }
    }

    return { retried, succeeded };
  });

  return NextResponse.json({ ok: true, retried: result.retried, succeeded: result.succeeded });
}

import { NextResponse } from "next/server";
import { sql, lt, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { emailMessage } from "@/db/schema/audit";
import { verifyCronSecret } from "@/lib/cron-auth";
import { dispatchEmail } from "@/server/email/dispatch";

const ADVISORY_LOCK_ID = 9002;
const MAX_ATTEMPTS = 3;

/**
 * Drains both first-attempt 'queued' messages and 'failed' retries — the
 * old route only processed 'failed' rows, so newly queued emails (e.g.
 * course_completed enqueued from certificate.tsx) sat in the DB forever.
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
            // Mark exhausted attempts as 'failed' so the retry path keeps
            // working on the next tick; first-attempt failures also flip to
            // 'failed' so the next cron tick picks them up via the same
            // status filter.
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

  return NextResponse.json({
    ok: true,
    retried: result.retried,
    succeeded: result.succeeded,
  });
}

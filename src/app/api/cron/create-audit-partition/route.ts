import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { verifyCronSecret } from "@/lib/cron-auth";

function nextMonthName(d = new Date()): { table: string; start: string; end: string } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const mm = String(nextM).padStart(2, "0");
  const start = `${nextY}-${mm}-01`;
  const endM = nextM === 12 ? 1 : nextM + 1;
  const endY = nextM === 12 ? nextY + 1 : nextY;
  const endMm = String(endM).padStart(2, "0");
  const end = `${endY}-${endMm}-01`;
  return { table: `audit_log_${nextY}_${mm}`, start, end };
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { table, start, end } = nextMonthName();

  // Idempotent: skip if partition already exists.
  const exists = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ${table}
    ) AS "exists"
  `);
  if (exists[0]?.exists) {
    return NextResponse.json({ ok: true, table, created: false, note: "already_exists" });
  }

  await db.execute(sql`
    CREATE TABLE ${sql.raw(table)} PARTITION OF audit_log
    FOR VALUES FROM (${start}) TO (${end})
  `);

  return NextResponse.json({ ok: true, table, created: true });
}

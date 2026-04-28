import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { cleanupExpiredIdempotency } from "@/server/services/idempotency";

export async function POST(request: Request) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupExpiredIdempotency();
  return NextResponse.json({ ok: true, deleted });
}

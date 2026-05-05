import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth-session";
import { upsertLessonProgress } from "@/server/repos/progress";
import {
  checkRateLimit,
  getClientIP,
  rateLimitConfigs,
} from "@/lib/rate-limit";

const schema = z.object({ lessonId: z.string().uuid() });

export async function POST(req: Request) {
  const limit = checkRateLimit(
    getClientIP(req),
    "/api/learn/start",
    rateLimitConfigs.api,
  );
  if (!limit.allowed) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }

  const { user } = await requireSession();
  if (user.role === "admin") {
    return NextResponse.json({ ok: true, ignored: "admin_preview" });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }

  await upsertLessonProgress(user.id, parsed.data.lessonId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth-session";
import { updateWatchedSeconds, markLessonComplete } from "@/server/repos/progress";

const schema = z.object({
  lessonId: z.string().uuid(),
  watchedSeconds: z.number().int().min(0),
  markComplete: z.boolean().optional(),
});

const COMPLETE_SENTINEL = 999_000;

export async function POST(req: Request) {
  const { user } = await requireSession();
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

  const { lessonId, watchedSeconds, markComplete } = parsed.data;

  if (markComplete || watchedSeconds >= COMPLETE_SENTINEL) {
    await markLessonComplete(user.id, lessonId);
  } else {
    await updateWatchedSeconds(user.id, lessonId, watchedSeconds);
  }

  return NextResponse.json({ ok: true, completed: markComplete || watchedSeconds >= COMPLETE_SENTINEL });
}

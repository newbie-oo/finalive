import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth-session";
import { updateWatchedSeconds } from "@/server/repos/progress";

const schema = z.object({
  lessonId: z.string().uuid(),
  watchedSeconds: z.number().int().min(0),
});

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

  await updateWatchedSeconds(user.id, parsed.data.lessonId, parsed.data.watchedSeconds);
  return NextResponse.json({ ok: true });
}

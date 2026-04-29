import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { lesson, courseModule } from "@/db/schema/course";
import { updateWatchedSeconds, markLessonComplete } from "@/server/repos/progress";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { issueCertificate } from "@/server/actions/certificate";

const schema = z.object({
  lessonId: z.string().uuid(),
  watchedSeconds: z.number().int().min(0),
  markComplete: z.boolean().optional(),
});

const COMPLETE_SENTINEL = 999_000;

export async function POST(req: Request) {
  const { user } = await requireSession();
  // Admin previews must not record progress — otherwise an admin walking
  // through a course would auto-complete and trigger a certificate flow
  // they can never redeem.
  if ((user as { role?: string }).role === "admin") {
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

  const { lessonId, watchedSeconds, markComplete } = parsed.data;
  const isComplete = markComplete || watchedSeconds >= COMPLETE_SENTINEL;

  if (isComplete) {
    await markLessonComplete(user.id, lessonId);

    // Check if course is now fully completed and issue certificate.
    const [lessonRow] = await db
      .select({ courseId: courseModule.courseId })
      .from(lesson)
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .where(eq(lesson.id, lessonId))
      .limit(1);

    if (lessonRow) {
      const { completed, enrollmentId } = await checkAndMarkCourseComplete(
        user.id,
        lessonRow.courseId,
      );
      if (completed && enrollmentId) {
        await issueCertificate(enrollmentId);
      }
    }
  } else {
    await updateWatchedSeconds(user.id, lessonId, watchedSeconds);
  }

  return NextResponse.json({ ok: true, completed: isComplete });
}

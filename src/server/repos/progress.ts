import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

export async function upsertLessonProgress(
  userId: string,
  lessonId: string,
): Promise<void> {
  const existing = await db
    .select({ id: lessonProgress.id })
    .from(lessonProgress)
    .where(
      and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(lessonProgress)
      .set({ lastWatchedAt: new Date(), updatedAt: new Date() })
      .where(eq(lessonProgress.id, existing[0].id));
  } else {
    await db.insert(lessonProgress).values({
      userId,
      lessonId,
      status: "in_progress",
      watchedSeconds: 0,
      lastWatchedAt: new Date(),
    });
  }
}

export async function updateWatchedSeconds(
  userId: string,
  lessonId: string,
  watchedSeconds: number,
): Promise<void> {
  await db
    .update(lessonProgress)
    .set({
      watchedSeconds: Math.max(0, watchedSeconds),
      lastWatchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
    );
}

export async function markLessonComplete(
  userId: string,
  lessonId: string,
): Promise<void> {
  await db
    .update(lessonProgress)
    .set({ status: "completed", updatedAt: new Date() })
    .where(
      and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
    );
}

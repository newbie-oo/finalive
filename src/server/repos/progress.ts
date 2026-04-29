import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

/**
 * Atomic upsert. Uses the unique constraint `lp_user_lesson_uk` as the
 * conflict target so concurrent calls (e.g. lesson page mounting twice
 * in StrictMode + a stale-prefetch race) collapse to one row instead of
 * tripping a 500. The previous read-then-insert was a TOCTOU bug — two
 * callers that both saw "no row" raced to INSERT and the loser crashed.
 */
export async function upsertLessonProgress(
  userId: string,
  lessonId: string,
): Promise<void> {
  const now = new Date();
  await db
    .insert(lessonProgress)
    .values({
      userId,
      lessonId,
      status: "in_progress",
      watchedSeconds: 0,
      lastWatchedAt: now,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { lastWatchedAt: now, updatedAt: now },
    });
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

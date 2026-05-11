import "server-only";
import { eq } from "drizzle-orm";
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
	const now = new Date();
	await db
		.insert(lessonProgress)
		.values({
			userId,
			lessonId,
			status: "in_progress",
			watchedSeconds: Math.max(0, watchedSeconds),
			lastWatchedAt: now,
		})
		.onConflictDoUpdate({
			target: [lessonProgress.userId, lessonProgress.lessonId],
			set: {
				watchedSeconds: Math.max(0, watchedSeconds),
				lastWatchedAt: now,
				updatedAt: now,
			},
		});
}

export async function markLessonComplete(
	userId: string,
	lessonId: string,
	durationSeconds?: number | null,
): Promise<void> {
	const now = new Date();
	await db
		.insert(lessonProgress)
		.values({
			userId,
			lessonId,
			status: "completed",
			watchedSeconds: durationSeconds ?? 0,
			lastWatchedAt: now,
		})
		.onConflictDoUpdate({
			target: [lessonProgress.userId, lessonProgress.lessonId],
			set: {
				status: "completed",
				watchedSeconds: durationSeconds ?? 0,
				updatedAt: now,
			},
		});
}

export async function deleteLessonProgressByUserId(
	userId: string,
): Promise<void> {
	await db.delete(lessonProgress).where(eq(lessonProgress.userId, userId));
}

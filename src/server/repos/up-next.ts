import "server-only";
import { and, asc, eq, sql, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import { lessonProgress } from "@/db/schema/progress";

export interface UpNextItem {
	courseSlug: string;
	courseTitle: string;
	coverStorageKey: string | null;
	lessonId: string;
	lessonTitle: string;
	durationSeconds: number | null;
}

/**
 * Cross-course "what should I watch next" list. For each course the user
 * is enrolled in (and has not finished), returns the first lesson whose
 * progress row is missing or not yet `completed`. Result is at most one
 * row per course, ordered by enrollment recency.
 */
export const UpNextRepo = {
	async listForUser(userId: string, limit = 3): Promise<UpNextItem[]> {
		const rows = await db
			.selectDistinctOn([course.id], {
				courseId: course.id,
				courseSlug: course.slug,
				courseTitle: course.title,
				coverStorageKey: mediaAsset.storageKey,
				lessonId: lesson.id,
				lessonTitle: lesson.title,
				durationSeconds: lesson.durationSeconds,
				enrollmentCreatedAt: enrollment.createdAt,
				moduleSortOrder: courseModule.sortOrder,
				lessonSortOrder: lesson.sortOrder,
			})
			.from(enrollment)
			.innerJoin(course, eq(enrollment.courseId, course.id))
			.innerJoin(courseModule, eq(courseModule.courseId, course.id))
			.innerJoin(lesson, eq(lesson.moduleId, courseModule.id))
			.leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
			.leftJoin(
				lessonProgress,
				and(
					eq(lessonProgress.lessonId, lesson.id),
					eq(lessonProgress.userId, userId),
					eq(lessonProgress.status, "completed"),
				),
			)
			.where(
				and(
					eq(enrollment.userId, userId),
					isNull(enrollment.completedAt),
					sql`${course.deletedAt} IS NULL`,
					sql`${courseModule.deletedAt} IS NULL`,
					sql`${lesson.deletedAt} IS NULL`,
					isNull(lessonProgress.id),
				),
			)
			.orderBy(
				asc(course.id),
				asc(courseModule.sortOrder),
				asc(lesson.sortOrder),
			);

		// Re-sort by enrollment recency client-side: DISTINCT ON forces the
		// course-id ordering inside the query so we can't influence ranking
		// of distinct rows from inside Postgres without a subquery.
		const sorted = [...rows].sort(
			(a, b) =>
				new Date(b.enrollmentCreatedAt).getTime() -
				new Date(a.enrollmentCreatedAt).getTime(),
		);

		return sorted.slice(0, limit).map((r) => ({
			courseSlug: r.courseSlug,
			courseTitle: r.courseTitle,
			coverStorageKey: r.coverStorageKey ?? null,
			lessonId: r.lessonId,
			lessonTitle: r.lessonTitle,
			durationSeconds: r.durationSeconds,
		}));
	},
};

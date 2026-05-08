import "server-only";
import { and, eq } from "drizzle-orm";
import { notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";

export interface LessonAccessRow {
	courseId: string;
	courseIsFree: boolean;
	lessonIsFree: boolean;
	lessonIsPreview: boolean;
}

/**
 * Returns the minimum data needed to authorize a write against a lesson:
 * its parent course id and the free/preview flags on both course and lesson.
 *
 * Returns null when the lesson is missing or soft-deleted — callers should
 * treat that as 404 to avoid leaking lesson existence to unauthorized users.
 */
export async function getLessonAccessRow(
	lessonId: string,
): Promise<LessonAccessRow | null> {
	const rows = await db
		.select({
			courseId: course.id,
			courseIsFree: course.isFree,
			lessonIsFree: lesson.isFree,
			lessonIsPreview: lesson.isPreview,
		})
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.innerJoin(course, eq(courseModule.courseId, course.id))
		.where(
			and(
				eq(lesson.id, lessonId),
				notDeleted(lesson),
				notDeleted(courseModule),
				notDeleted(course),
			),
		)
		.limit(1);
	return rows[0] ?? null;
}

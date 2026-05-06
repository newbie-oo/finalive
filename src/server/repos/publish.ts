import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { course, lesson, courseModule } from "@/db/schema/course";

export async function getCourseMetaForPublish(
	courseId: string,
): Promise<{ title: string; summary: string } | null> {
	const rows = await db
		.select({ title: course.title, summary: course.summary })
		.from(course)
		.where(and(eq(course.id, courseId), isNull(course.deletedAt)))
		.limit(1);
	return rows[0] ?? null;
}

export async function getLessonsForPublish(courseId: string): Promise<
	Array<{
		id: string;
		title: string;
		bodyMd: string | null;
		videoMediaId: string | null;
	}>
> {
	return db
		.select({
			id: lesson.id,
			title: lesson.title,
			bodyMd: lesson.bodyMd,
			videoMediaId: lesson.videoMediaId,
		})
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.where(
			and(
				eq(courseModule.courseId, courseId),
				isNull(lesson.deletedAt),
				isNull(courseModule.deletedAt),
			),
		);
}

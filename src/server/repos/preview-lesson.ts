import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { coursePublic, notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";

export interface PreviewLesson {
	id: string;
	courseSlug: string;
	courseTitle: string;
	title: string;
	bunnyVideoId: string | null;
	bodyMd: string | null;
	isPreview: boolean;
	isFree: boolean;
}

export async function getPreviewLesson(
	courseSlug: string,
	lessonId: string,
): Promise<PreviewLesson | null> {
	const rows = await db
		.select({
			id: lesson.id,
			title: lesson.title,
			bodyMd: lesson.bodyMd,
			isPreview: lesson.isPreview,
			isFree: lesson.isFree,
			bunnyVideoId: sql<
				string | null
			>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
				"bunny_video_id",
			),
			courseSlug: course.slug,
			courseTitle: course.title,
		})
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.innerJoin(course, eq(courseModule.courseId, course.id))
		.leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
		.where(
			and(
				eq(lesson.id, lessonId),
				eq(course.slug, courseSlug),
				coursePublic(),
				notDeleted(lesson),
			),
		)
		.limit(1);

	const row = rows[0];
	if (!row) return null;
	return {
		id: row.id,
		courseSlug: row.courseSlug,
		courseTitle: row.courseTitle,
		title: row.title,
		bunnyVideoId: row.bunnyVideoId,
		bodyMd: row.bodyMd,
		isPreview: row.isPreview,
		isFree: row.isFree,
	};
}

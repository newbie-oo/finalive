import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";

export interface CurriculumLesson {
	id: string;
	title: string;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	sortOrder: number;
	/** Admin-only: full markdown body. Public/learn views ignore this. */
	bodyMd?: string | null;
	/** Admin-only: video asset link. Public/learn views ignore this. */
	videoMediaId?: string | null;
	/** Resolved Bunny video id if the media asset is bunny_stream. */
	bunnyVideoId?: string | null;
	/** Quiz id attached to this lesson, if any. */
	quizId?: string | null;
}

export interface CurriculumModule {
	id: string;
	title: string;
	sortOrder: number;
	lessons: CurriculumLesson[];
}

/**
 * Fetch the full curriculum tree for a course.
 *
 * This is the single source of truth for curriculum assembly.
 * All views (public, admin, learn) call this and map to their
 * own narrower types. The query returns the admin superset of
 * fields so no view has to re-implement the tree walk.
 */
export async function getCurriculumTree(
	courseId: string,
): Promise<CurriculumModule[]> {
	const modules = await db
		.select({
			id: courseModule.id,
			title: courseModule.title,
			sortOrder: courseModule.sortOrder,
		})
		.from(courseModule)
		.where(
			and(eq(courseModule.courseId, courseId), isNull(courseModule.deletedAt)),
		)
		.orderBy(asc(courseModule.sortOrder));

	if (modules.length === 0) return [];

	const moduleIds = modules.map((m) => m.id);

	const lessonsRows = await db
		.select({
			id: lesson.id,
			moduleId: lesson.moduleId,
			title: lesson.title,
			bodyMd: lesson.bodyMd,
			durationSeconds: lesson.durationSeconds,
			isPreview: lesson.isPreview,
			isFree: lesson.isFree,
			sortOrder: lesson.sortOrder,
			videoMediaId: lesson.videoMediaId,
			bunnyVideoId: sql<
				string | null
			>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
				"bunny_video_id",
			),
			quizId: quiz.id,
		})
		.from(lesson)
		.leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
		.leftJoin(quiz, and(eq(quiz.lessonId, lesson.id), isNull(quiz.deletedAt)))
		.where(and(isNull(lesson.deletedAt), inArray(lesson.moduleId, moduleIds)))
		.orderBy(asc(lesson.sortOrder));

	const byModule = new Map<string, CurriculumLesson[]>();
	for (const l of lessonsRows) {
		const list = byModule.get(l.moduleId) ?? [];
		list.push({
			id: l.id,
			title: l.title,
			durationSeconds: l.durationSeconds,
			isPreview: l.isPreview,
			isFree: l.isFree,
			sortOrder: l.sortOrder,
			bodyMd: l.bodyMd,
			videoMediaId: l.videoMediaId,
			bunnyVideoId: l.bunnyVideoId,
			quizId: l.quizId ?? null,
		});
		byModule.set(l.moduleId, list);
	}

	return modules.map((m) => ({
		id: m.id,
		title: m.title,
		sortOrder: m.sortOrder,
		lessons: byModule.get(m.id) ?? [],
	}));
}

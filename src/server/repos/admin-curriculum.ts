import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notDeleted } from "@/db/predicates";
import { courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";
import { getCurriculumTree, lessonSelectColumns } from "./curriculum-repo";

export interface AdminCurriculumLesson {
	id: string;
	title: string;
	bodyMd: string | null;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	sortOrder: number;
	videoMediaId: string | null;
	bunnyVideoId: string | null;
	quizId: string | null;
}

export interface AdminCurriculumModule {
	id: string;
	title: string;
	sortOrder: number;
	lessons: AdminCurriculumLesson[];
}

/** Delegates to curriculum-repo (single source of truth) and maps to admin types. */
export async function getAdminCourseCurriculum(
	courseId: string,
): Promise<AdminCurriculumModule[]> {
	const tree = await getCurriculumTree(courseId);
	return tree.map((m) => ({
		id: m.id,
		title: m.title,
		sortOrder: m.sortOrder,
		lessons: m.lessons.map((l) => ({
			id: l.id,
			title: l.title,
			bodyMd: l.bodyMd ?? null,
			durationSeconds: l.durationSeconds,
			isPreview: l.isPreview,
			isFree: l.isFree,
			sortOrder: l.sortOrder,
			videoMediaId: l.videoMediaId ?? null,
			bunnyVideoId: l.bunnyVideoId ?? null,
			quizId: l.quizId ?? null,
		})),
	}));
}

export async function getAdminLessonById(lessonId: string) {
	const rows = await db
		.select(lessonSelectColumns)
		.from(lesson)
		.leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
		.leftJoin(quiz, and(eq(quiz.lessonId, lesson.id), notDeleted(quiz)))
		.where(and(eq(lesson.id, lessonId), notDeleted(lesson)))
		.limit(1);
	return rows[0] ?? null;
}

export async function createAdminModule(input: {
	courseId: string;
	title: string;
	sortOrder: number;
	createdByUserId: string;
}) {
	const [row] = await db
		.insert(courseModule)
		.values({
			courseId: input.courseId,
			title: input.title,
			sortOrder: input.sortOrder,
			createdByUserId: input.createdByUserId,
		})
		.returning({ id: courseModule.id });
	return row!.id;
}

export async function createAdminLesson(input: {
	moduleId: string;
	title: string;
	sortOrder: number;
	createdByUserId: string;
}) {
	const [row] = await db
		.insert(lesson)
		.values({
			moduleId: input.moduleId,
			title: input.title,
			bodyMd: "",
			sortOrder: input.sortOrder,
			createdByUserId: input.createdByUserId,
		})
		.returning({ id: lesson.id });
	return row!.id;
}

export async function updateAdminModule(
	moduleId: string,
	input: { title?: string },
) {
	await db
		.update(courseModule)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(courseModule.id, moduleId));
}

/**
 * Soft-deletes a module and every lesson under it. We rely on cascading
 * soft-deletes (deletedAt) rather than hard-deletes so progress/enrollment
 * audit history stays intact. Quizzes attached to those lessons are also
 * tombstoned.
 */
export async function deleteAdminModule(moduleId: string) {
	const now = new Date();
	await db.transaction(async (tx) => {
		// Tombstone the module itself
		await tx
			.update(courseModule)
			.set({ deletedAt: now, updatedAt: now })
			.where(eq(courseModule.id, moduleId));

		// Tombstone its lessons
		const lessonRows = await tx
			.select({ id: lesson.id })
			.from(lesson)
			.where(and(eq(lesson.moduleId, moduleId), notDeleted(lesson)));
		const lessonIds = lessonRows.map((r) => r.id);
		if (lessonIds.length > 0) {
			await tx
				.update(lesson)
				.set({ deletedAt: now, updatedAt: now })
				.where(inArray(lesson.id, lessonIds));
			// Tombstone quizzes whose lesson is gone
			await tx
				.update(quiz)
				.set({ deletedAt: now, updatedAt: now })
				.where(and(inArray(quiz.lessonId, lessonIds), notDeleted(quiz)));
		}
	});
}

export async function deleteAdminLesson(lessonId: string) {
	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(lesson)
			.set({ deletedAt: now, updatedAt: now })
			.where(eq(lesson.id, lessonId));
		await tx
			.update(quiz)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(quiz.lessonId, lessonId), notDeleted(quiz)));
	});
}

export async function updateAdminLesson(
	lessonId: string,
	input: {
		title?: string;
		bodyMd?: string | null;
		isPreview?: boolean;
		isFree?: boolean;
		durationSeconds?: number | null;
		videoMediaId?: string | null;
	},
) {
	await db
		.update(lesson)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(lesson.id, lessonId));
}

/** Fast existence check: does this module belong to the given course? */
export async function moduleExistsInCourse(
	moduleId: string,
	courseId: string,
): Promise<boolean> {
	const rows = await db
		.select({ one: sql<number>`1` })
		.from(courseModule)
		.where(
			and(
				eq(courseModule.id, moduleId),
				eq(courseModule.courseId, courseId),
				notDeleted(courseModule),
			),
		)
		.limit(1);
	return rows.length > 0;
}

/** Fast existence check: does this lesson belong to the given course? */
export async function lessonExistsInCourse(
	lessonId: string,
	courseId: string,
): Promise<boolean> {
	const rows = await db
		.select({ one: sql<number>`1` })
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.where(
			and(
				eq(lesson.id, lessonId),
				eq(courseModule.courseId, courseId),
				notDeleted(lesson),
				notDeleted(courseModule),
			),
		)
		.limit(1);
	return rows.length > 0;
}

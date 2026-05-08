import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress } from "@/db/schema/progress";
import { mediaAsset } from "@/db/schema/media";
import { getCurriculumTree } from "./curriculum-repo";

export interface LearnLesson {
	id: string;
	title: string;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	sortOrder: number;
	quizId: string | null;
}

export interface LearnModule {
	id: string;
	title: string;
	sortOrder: number;
	lessons: LearnLesson[];
}

export interface LearnCourse {
	id: string;
	slug: string;
	title: string;
	isFree: boolean;
}

export interface LearnProgress {
	lessonId: string;
	status: string;
	watchedSeconds: number;
}

export interface GetLearnCourseResult {
	course: LearnCourse;
	modules: LearnModule[];
	isEnrolled: boolean;
	progress: LearnProgress[];
	resumeLessonId: string | null;
}

export interface GetLearnCourseOptions {
	/** Allow draft/archived courses through. Set true for admin views. */
	allowUnpublished?: boolean;
}

// Memoized per-request: layout, page, and nested route segments under
// /learn/[courseSlug] all call getLearnCourse with the same args during
// a single render. React cache() keys on argument identity, so we
// collapse `options` to a single boolean primitive before delegating.
const _getLearnCourseCached = cache(
	(courseSlug: string, userId: string | null, allowUnpublished: boolean) =>
		_getLearnCourse(courseSlug, userId, { allowUnpublished }),
);

export function getLearnCourse(
	courseSlug: string,
	userId: string | null,
	options: GetLearnCourseOptions = {},
): Promise<GetLearnCourseResult | null> {
	return _getLearnCourseCached(courseSlug, userId, options.allowUnpublished ?? false);
}

async function _getLearnCourse(
	courseSlug: string,
	userId: string | null,
	options: GetLearnCourseOptions = {},
): Promise<GetLearnCourseResult | null> {
	const courseConditions = [
		eq(course.slug, courseSlug),
		notDeleted(course),
	];
	if (!options.allowUnpublished) {
		courseConditions.push(eq(course.status, "published"));
	}

	const courseRows = await db
		.select({
			id: course.id,
			slug: course.slug,
			title: course.title,
			isFree: course.isFree,
		})
		.from(course)
		.where(and(...courseConditions))
		.limit(1);

	const courseRow = courseRows[0];
	if (!courseRow) return null;

	// All four reads parallelise: each one only depends on courseRow.id and
	// (optionally) userId, never on the result of another. Cuts the
	// course-page TTFB from 4 sequential round-trips to 1.
	const treePromise = getCurriculumTree(courseRow.id);

	const enrollPromise = userId
		? db
				.select({ id: enrollment.id })
				.from(enrollment)
				.where(
					and(
						eq(enrollment.userId, userId),
						eq(enrollment.courseId, courseRow.id),
						eq(enrollment.status, "active"),
					),
				)
				.limit(1)
		: Promise.resolve([] as { id: string }[]);

	// Scope progress by JOIN through lesson + module rather than IN(lessonIds).
	// This removes the dependency on the curriculum tree result so the query
	// can run alongside it.
	const progressPromise: Promise<LearnProgress[]> = userId
		? db
				.select({
					lessonId: lessonProgress.lessonId,
					status: lessonProgress.status,
					watchedSeconds: lessonProgress.watchedSeconds,
				})
				.from(lessonProgress)
				.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
				.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
				.where(
					and(
						eq(lessonProgress.userId, userId),
						eq(courseModule.courseId, courseRow.id),
						notDeleted(lesson),
						notDeleted(courseModule),
					),
				)
		: Promise.resolve([]);

	// Resume: most recently updated lesson, preferring in_progress over completed.
	// Done at the DB to keep status priority + updatedAt sorting consistent.
	// Fire unconditionally when userId is present; the result is gated on
	// isEnrolled below to preserve previous behaviour for stale rows.
	const resumePromise = userId
		? db
				.select({ lessonId: lessonProgress.lessonId })
				.from(lessonProgress)
				.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
				.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
				.where(
					and(
						eq(lessonProgress.userId, userId),
						eq(courseModule.courseId, courseRow.id),
						sql`${lessonProgress.status} <> 'not_started'`,
					),
				)
				.orderBy(
					sql`CASE WHEN ${lessonProgress.status} = 'in_progress' THEN 0 ELSE 1 END`,
					desc(lessonProgress.updatedAt),
				)
				.limit(1)
		: Promise.resolve([] as { lessonId: string }[]);

	const [tree, enrollRows, progress, resumeRows] = await Promise.all([
		treePromise,
		enrollPromise,
		progressPromise,
		resumePromise,
	]);

	const curriculum: LearnModule[] = tree
		.map((m) => ({
			id: m.id,
			title: m.title,
			sortOrder: m.sortOrder,
			lessons: m.lessons.map((l) => ({
				id: l.id,
				title: l.title,
				durationSeconds: l.durationSeconds,
				isPreview: l.isPreview,
				isFree: l.isFree,
				sortOrder: l.sortOrder,
				quizId: l.quizId ?? null,
			})),
		}))
		.filter((m) => m.lessons.length > 0);

	const isEnrolled = enrollRows.length > 0;
	const resume = isEnrolled ? resumeRows[0] : undefined;
	let resumeLessonId: string | null = resume ? resume.lessonId : null;

	// For non-enrolled users, resume points to first free/preview lesson.
	if (!resumeLessonId) {
		outer: for (const mod of curriculum) {
			for (const les of mod.lessons) {
				if (les.isPreview || les.isFree || courseRow.isFree) {
					resumeLessonId = les.id;
					break outer;
				}
			}
		}
	}

	// Fallback to very first lesson.
	const firstModule = curriculum[0];
	if (!resumeLessonId && firstModule && firstModule.lessons.length > 0) {
		resumeLessonId = firstModule.lessons[0]!.id;
	}

	return {
		course: courseRow,
		modules: curriculum,
		isEnrolled,
		progress,
		resumeLessonId,
	};
}

export interface GetLearnLessonResult {
	id: string;
	title: string;
	bodyMd: string | null;
	bunnyVideoId: string | null;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
	moduleTitle: string;
	nextLessonId: string | null;
	prevLessonId: string | null;
}

export async function getLearnLesson(
	courseSlug: string,
	lessonId: string,
	options: GetLearnCourseOptions = {},
): Promise<GetLearnLessonResult | null> {
	const conditions = [
		eq(lesson.id, lessonId),
		eq(course.slug, courseSlug),
		notDeleted(lesson),
		notDeleted(course),
	];
	if (!options.allowUnpublished) {
		conditions.push(eq(course.status, "published"));
	}
	const rows = await db
		.select({
			id: lesson.id,
			title: lesson.title,
			bodyMd: lesson.bodyMd,
			durationSeconds: lesson.durationSeconds,
			isPreview: lesson.isPreview,
			isFree: lesson.isFree,
			videoMediaId: lesson.videoMediaId,
			bunnyVideoId: sql<
				string | null
			>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
				"bunny_video_id",
			),
			courseId: course.id,
			courseSlug: course.slug,
			courseTitle: course.title,
			moduleTitle: courseModule.title,
			moduleId: courseModule.id,
			moduleSortOrder: courseModule.sortOrder,
			lessonSortOrder: lesson.sortOrder,
		})
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.innerJoin(course, eq(courseModule.courseId, course.id))
		.leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
		.where(and(...conditions))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	// Windowed lookup: first lesson whose (moduleSort, lessonSort) sorts after the current.
	// Avoids fetching every lesson in the course just to walk the array.
	const [nextRow] = await db
		.select({ id: lesson.id })
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.where(
			and(
				eq(courseModule.courseId, row.courseId),
				notDeleted(lesson),
				notDeleted(courseModule),
				sql`(${courseModule.sortOrder}, ${lesson.sortOrder}) > (${row.moduleSortOrder}, ${row.lessonSortOrder})`,
			),
		)
		.orderBy(asc(courseModule.sortOrder), asc(lesson.sortOrder))
		.limit(1);

	const nextLessonId = nextRow?.id ?? null;

	// Previous lesson
	const [prevRow] = await db
		.select({ id: lesson.id })
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.where(
			and(
				eq(courseModule.courseId, row.courseId),
				notDeleted(lesson),
				notDeleted(courseModule),
				sql`(${courseModule.sortOrder}, ${lesson.sortOrder}) < (${row.moduleSortOrder}, ${row.lessonSortOrder})`,
			),
		)
		.orderBy(desc(courseModule.sortOrder), desc(lesson.sortOrder))
		.limit(1);

	const prevLessonId = prevRow?.id ?? null;

	return {
		id: row.id,
		title: row.title,
		bodyMd: row.bodyMd,
		bunnyVideoId: row.bunnyVideoId,
		durationSeconds: row.durationSeconds,
		isPreview: row.isPreview,
		isFree: row.isFree,
		courseId: row.courseId,
		courseSlug: row.courseSlug,
		courseTitle: row.courseTitle,
		moduleTitle: row.moduleTitle,
		nextLessonId,
		prevLessonId,
	};
}

import "server-only";
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNull,
	notInArray,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";
import { enrollmentCountSubq } from "./course-queries";
import { getCurriculumTree, lessonSelectColumns } from "./curriculum-repo";

export interface AdminCourseListItem {
	id: string;
	slug: string;
	title: string;
	status: string;
	isFree: boolean;
	price: string;
	publishedAt: Date | null;
	createdAt: Date;
	/** Count of active enrollments — surfaced to admins on the courses list. */
	enrollmentCount: number;
}

export interface ListAdminCoursesOptions {
	/** Free-text search across title + slug. Case-insensitive. */
	q?: string;
	/** Filter by status. Pass "all" or omit to include every status. */
	status?: "draft" | "published" | "archived" | "all";
}

export async function listAdminCourses(
	options: ListAdminCoursesOptions = {},
): Promise<AdminCourseListItem[]> {
	const conditions = [isNull(course.deletedAt)];

	if (options.status && options.status !== "all") {
		conditions.push(eq(course.status, options.status));
	}

	const trimmed = options.q?.trim();
	if (trimmed) {
		const like = `%${trimmed}%`;
		const text = sql`(${course.title} ILIKE ${like} OR ${course.slug} ILIKE ${like})`;
		conditions.push(text);
	}

	const rows = await db
		.select({
			id: course.id,
			slug: course.slug,
			title: course.title,
			status: course.status,
			isFree: course.isFree,
			price: course.price,
			publishedAt: course.publishedAt,
			createdAt: course.createdAt,
			enrollmentCount: enrollmentCountSubq.count,
		})
		.from(course)
		.leftJoin(enrollmentCountSubq, eq(enrollmentCountSubq.courseId, course.id))
		.where(and(...conditions))
		.orderBy(desc(course.createdAt));

	return rows.map((r) => ({ ...r, enrollmentCount: r.enrollmentCount ?? 0 }));
}

/**
 * Courses an admin can grant to a specific student. Filters out:
 * - drafts and archived courses (admins should only gift production catalog)
 * - courses the student is already enrolled in (any non-cancelled enrollment)
 */
export async function listGrantableCoursesForUser(
	studentUserId: string,
): Promise<{ id: string; title: string }[]> {
	const enrolledRows = await db
		.select({ courseId: enrollment.courseId })
		.from(enrollment)
		.where(eq(enrollment.userId, studentUserId));
	const enrolledIds = enrolledRows.map((r) => r.courseId);

	const where = enrolledIds.length
		? and(
				eq(course.status, "published"),
				isNull(course.deletedAt),
				notInArray(course.id, enrolledIds),
			)
		: and(eq(course.status, "published"), isNull(course.deletedAt));

	return db
		.select({ id: course.id, title: course.title })
		.from(course)
		.where(where)
		.orderBy(asc(course.title));
}

export async function getAdminCourseById(courseId: string) {
	const rows = await db
		.select()
		.from(course)
		.where(and(eq(course.id, courseId), isNull(course.deletedAt)))
		.limit(1);
	return rows[0] ?? null;
}

export async function createAdminCourse(input: {
	slug: string;
	title: string;
	summary: string;
	descriptionMd?: string;
	coverMediaId?: string;
	price: string;
	isFree: boolean;
	ownerUserId: string;
}) {
	// Bidirectional invariant: free courses always have price 0, AND price 0
	// always means free. The latter prevents the legacy bug where admins
	// entered ฿0 with isFree=false, sending students into the slip-upload flow
	// for a free course.
	const priceNumber = Number(input.price);
	const isFree = input.isFree || priceNumber === 0;
	const price = isFree ? "0.00" : input.price;
	const [row] = await db
		.insert(course)
		.values({
			slug: input.slug,
			title: input.title,
			summary: input.summary,
			descriptionMd: input.descriptionMd,
			coverMediaId: input.coverMediaId,
			price,
			isFree,
			ownerUserId: input.ownerUserId,
			createdByUserId: input.ownerUserId,
			status: "draft",
		})
		.returning({ id: course.id });
	return row!.id;
}

export async function updateAdminCourse(
	courseId: string,
	input: {
		slug?: string;
		title?: string;
		summary?: string;
		price?: string;
		isFree?: boolean;
		status?: string;
		publishedAt?: Date;
		coverMediaId?: string | null;
	},
) {
	const updates: typeof input = { ...input };

	// Bidirectional invariant on update:
	// 1. isFree=true → force price=0
	// 2. price=0 → force isFree=true (so admins setting price to 0 don't trap
	//    students in the slip-upload flow for a "free" course).
	if (updates.isFree === true) {
		updates.price = "0.00";
	} else if (updates.price !== undefined && Number(updates.price) === 0) {
		updates.isFree = true;
		updates.price = "0.00";
	}

	await db
		.update(course)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(course.id, courseId));
}

// ─── Admin Curriculum ───

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
		.leftJoin(quiz, and(eq(quiz.lessonId, lesson.id), isNull(quiz.deletedAt)))
		.where(and(eq(lesson.id, lessonId), isNull(lesson.deletedAt)))
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
			.where(and(eq(lesson.moduleId, moduleId), isNull(lesson.deletedAt)));
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
				.where(and(inArray(quiz.lessonId, lessonIds), isNull(quiz.deletedAt)));
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
			.where(and(eq(quiz.lessonId, lessonId), isNull(quiz.deletedAt)));
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
				isNull(courseModule.deletedAt),
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
				isNull(lesson.deletedAt),
				isNull(courseModule.deletedAt),
			),
		)
		.limit(1);
	return rows.length > 0;
}

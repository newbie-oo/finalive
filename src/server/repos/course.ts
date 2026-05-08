import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import {
	buildOffsetResponse,
	type OffsetParams,
	type OffsetResponse,
} from "@/lib/pagination";
import { enrollmentCountSubq } from "./course-queries";

// Re-export for backward compatibility until callers migrate.
export { enrollmentCountSubq };

// TODO: replace with real subquery once lesson durations are indexed.
const courseDurationSubq = db
	.select({
		courseId: courseModule.courseId,
		totalSeconds:
			sql<number>`coalesce(sum(${lesson.durationSeconds}), 0)::int`.as(
				"total_seconds",
			),
		totalMinutes:
			sql<number>`coalesce(floor(sum(${lesson.durationSeconds}) / 60), 0)::int`.as(
				"total_minutes",
			),
	})
	.from(lesson)
	.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
	.where(notDeleted(lesson))
	.groupBy(courseModule.courseId)
	.as("course_duration");

export interface PublicCourseSummary {
	id: string;
	slug: string;
	title: string;
	summary: string;
	price: string;
	isFree: boolean;
	publishedAt: Date | null;
	coverStorageKey: string | null;
	enrollmentCount: number;
	/** Course lifecycle: 'draft' | 'published' | 'archived'. Surfaced so admin
	 * views can chip non-published courses. */
	status: string;
}

export interface ListPublishedCoursesParams extends OffsetParams {
	/** Free-text search across title and summary (case-insensitive). */
	q?: string;
	/** When true, restricts to is_free=true courses only. */
	freeOnly?: boolean;
	/** Price range filtering. */
	priceMin?: number;
	priceMax?: number;
	/** Duration range filtering (minutes). */
	durationMin?: number;
	durationMax?: number;
	/** Sort order. */
	sortBy?: "newest" | "price_asc" | "price_desc" | "popular";
}

export async function listPublishedCourses(
	params: ListPublishedCoursesParams,
): Promise<OffsetResponse<PublicCourseSummary>> {
	const conditions = [eq(course.status, "published"), notDeleted(course)];

	const trimmed = params.q?.trim();
	if (trimmed) {
		const like = `%${trimmed}%`;
		const text = or(ilike(course.title, like), ilike(course.summary, like));
		if (text) conditions.push(text);
	}
	if (params.freeOnly) {
		conditions.push(eq(course.isFree, true));
	}
	if (params.priceMin !== undefined) {
		conditions.push(sql`${course.price} >= ${params.priceMin}`);
	}
	if (params.priceMax !== undefined) {
		conditions.push(sql`${course.price} <= ${params.priceMax}`);
	}
	const needsDurationFilter =
		params.durationMin !== undefined || params.durationMax !== undefined;
	if (params.durationMin !== undefined) {
		conditions.push(
			sql`coalesce(${courseDurationSubq.totalMinutes}, 0) >= ${params.durationMin}`,
		);
	}
	if (params.durationMax !== undefined) {
		conditions.push(
			sql`coalesce(${courseDurationSubq.totalMinutes}, 0) <= ${params.durationMax}`,
		);
	}

	const where = and(...conditions);

	// Build order-by clause based on sortBy
	let orderBy = desc(course.publishedAt);
	switch (params.sortBy) {
		case "price_asc":
			orderBy = asc(course.price);
			break;
		case "price_desc":
			orderBy = desc(course.price);
			break;
		case "popular":
			orderBy = desc(sql`coalesce(${enrollmentCountSubq.count}, 0)`);
			break;
		case "newest":
		default:
			orderBy = desc(course.publishedAt);
			break;
	}

	const [rows, totalRows] = await Promise.all([
		db
			.select({
				id: course.id,
				slug: course.slug,
				title: course.title,
				summary: course.summary,
				price: course.price,
				isFree: course.isFree,
				status: course.status,
				publishedAt: course.publishedAt,
				coverMediaId: course.coverMediaId,
				coverStorageKey: mediaAsset.storageKey,
				enrollmentCount: enrollmentCountSubq.count,
				totalSeconds: courseDurationSubq.totalSeconds,
			})
			.from(course)
			.leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
			.leftJoin(
				enrollmentCountSubq,
				eq(enrollmentCountSubq.courseId, course.id),
			)
			.leftJoin(courseDurationSubq, eq(courseDurationSubq.courseId, course.id))
			.where(where)
			.orderBy(orderBy)
			.limit(params.per_page)
			.offset((params.page - 1) * params.per_page),
		needsDurationFilter
			? db
					.select({ value: count() })
					.from(course)
					.leftJoin(
						courseDurationSubq,
						eq(courseDurationSubq.courseId, course.id),
					)
					.where(where)
			: db.select({ value: count() }).from(course).where(where),
	]);

	const mappedRows = rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		summary: r.summary,
		price: r.price,
		isFree: r.isFree,
		status: r.status,
		publishedAt: r.publishedAt,
		coverStorageKey: r.coverStorageKey ?? null,
		enrollmentCount: r.enrollmentCount ?? 0,
		totalSeconds: r.totalSeconds ?? 0,
	}));

	const total = totalRows[0]?.value ?? 0;
	return buildOffsetResponse(mappedRows, total, params);
}

export interface PendingCheckoutInfo {
	pendingId: string;
	refCode: string;
	amount: string;
	expiresAt: Date;
	status: string;
	courseSlug: string;
	courseTitle: string;
}

export async function listFeaturedCourses(
	limit = 3,
): Promise<PublicCourseSummary[]> {
	const where = and(eq(course.status, "published"), notDeleted(course));
	const rows = await db
		.select({
			id: course.id,
			slug: course.slug,
			title: course.title,
			summary: course.summary,
			price: course.price,
			isFree: course.isFree,
			status: course.status,
			publishedAt: course.publishedAt,
			coverStorageKey: mediaAsset.storageKey,
			enrollmentCount: enrollmentCountSubq.count,
		})
		.from(course)
		.leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
		.leftJoin(enrollmentCountSubq, eq(enrollmentCountSubq.courseId, course.id))
		.where(where)
		.orderBy(desc(course.publishedAt))
		.limit(limit);

	return rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		summary: r.summary,
		price: r.price,
		isFree: r.isFree,
		status: r.status,
		publishedAt: r.publishedAt,
		coverStorageKey: r.coverStorageKey ?? null,
		enrollmentCount: r.enrollmentCount ?? 0,
	}));
}

export interface GetCourseBySlugOptions {
	/** When true, return draft/archived courses too. Admin views pass true so
	 * they can preview unpublished content; public views must keep this false. */
	includeUnpublished?: boolean;
}

export async function getPublishedCourseBySlug(
	slug: string,
	options: GetCourseBySlugOptions = {},
): Promise<PublicCourseSummary | null> {
	const conditions = [eq(course.slug, slug), notDeleted(course)];
	if (!options.includeUnpublished) {
		conditions.push(eq(course.status, "published"));
	}

	const rows = await db
		.select({
			id: course.id,
			slug: course.slug,
			title: course.title,
			summary: course.summary,
			price: course.price,
			isFree: course.isFree,
			status: course.status,
			publishedAt: course.publishedAt,
			coverStorageKey: mediaAsset.storageKey,
			enrollmentCount: enrollmentCountSubq.count,
		})
		.from(course)
		.leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
		.leftJoin(enrollmentCountSubq, eq(enrollmentCountSubq.courseId, course.id))
		.where(and(...conditions))
		.limit(1);

	const r = rows[0];
	if (!r) return null;
	return {
		id: r.id,
		slug: r.slug,
		title: r.title,
		summary: r.summary,
		price: r.price,
		isFree: r.isFree,
		status: r.status,
		publishedAt: r.publishedAt,
		coverStorageKey: r.coverStorageKey ?? null,
		enrollmentCount: r.enrollmentCount ?? 0,
	};
}

import { getCurriculumTree } from "./curriculum-repo";

export interface GetCourseCurriculumOptions {
	/**
	 * Include modules that contain zero lessons. Default `true` for admin views.
	 * Public views should pass `false` to hide empty modules from learners.
	 */
	includeEmptyModules?: boolean;
}

/** Re-export from curriculum-repo with public-type narrowing. */
export async function getCourseCurriculum(
	courseId: string,
	options: GetCourseCurriculumOptions = {},
): Promise<import("./curriculum-repo").CurriculumModule[]> {
	const tree = await getCurriculumTree(courseId);
	if (!options.includeEmptyModules) {
		return tree.filter((m) => m.lessons.length > 0);
	}
	return tree;
}

/**
 * Resolve the course ID that owns a given lesson.
 * Used by completion services to know which course to evaluate.
 */
export async function getCourseIdByLessonId(
	lessonId: string,
): Promise<string | null> {
	const [row] = await db
		.select({ courseId: courseModule.courseId })
		.from(lesson)
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.where(eq(lesson.id, lessonId))
		.limit(1);
	return row?.courseId ?? null;
}

export async function getCourseInfo(
	courseId: string,
): Promise<{ title: string; slug: string } | null> {
	const rows = await db
		.select({ title: course.title, slug: course.slug })
		.from(course)
		.where(eq(course.id, courseId))
		.limit(1);
	return rows[0] ?? null;
}

import "server-only";
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import {
	buildOffsetResponse,
	type OffsetParams,
	type OffsetResponse,
} from "@/lib/pagination";
import { coverImageUrl } from "@/lib/media-url";
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
	})
	.from(lesson)
	.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
	.where(isNull(lesson.deletedAt))
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
	/** Pre-computed public CDN URL. Safe to pass to Client Components. */
	coverImageUrl: string | null;
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
	const conditions = [eq(course.status, "published"), isNull(course.deletedAt)];

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
		db.select({ value: count() }).from(course).where(where),
	]);

	let mappedRows = rows.map((r) => ({
		id: r.id,
		slug: r.slug,
		title: r.title,
		summary: r.summary,
		price: r.price,
		isFree: r.isFree,
		status: r.status,
		publishedAt: r.publishedAt,
		coverStorageKey: r.coverStorageKey ?? null,
		coverImageUrl: coverImageUrl(r.coverStorageKey),
		enrollmentCount: r.enrollmentCount ?? 0,
		totalSeconds: r.totalSeconds ?? 0,
	}));

	// Client-side duration filter (TODO: move to SQL when duration is indexed)
	const { durationMin, durationMax } = params;
	if (durationMin !== undefined) {
		mappedRows = mappedRows.filter(
			(r) => Math.floor(r.totalSeconds / 60) >= durationMin,
		);
	}
	if (durationMax !== undefined) {
		mappedRows = mappedRows.filter(
			(r) => Math.floor(r.totalSeconds / 60) <= durationMax,
		);
	}

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
	const where = and(eq(course.status, "published"), isNull(course.deletedAt));
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
		coverImageUrl: coverImageUrl(r.coverStorageKey),
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
	const conditions = [eq(course.slug, slug), isNull(course.deletedAt)];
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
		coverImageUrl: coverImageUrl(r.coverStorageKey),
		enrollmentCount: r.enrollmentCount ?? 0,
	};
}

export interface PreviewLesson {
	id: string;
	courseSlug: string;
	courseTitle: string;
	title: string;
	bunnyVideoId: string | null;
	bodyMd: string | null;
	isPlayable: boolean;
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
			videoMediaId: lesson.videoMediaId,
			bunnyVideoId: sql<
				string | null
			>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
				"bunny_video_id",
			),
			courseId: course.id,
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
				eq(course.status, "published"),
				isNull(lesson.deletedAt),
				isNull(course.deletedAt),
			),
		)
		.limit(1);

	const row = rows[0];
	if (!row) return null;
	const playable = row.isPreview || row.isFree;
	return {
		id: row.id,
		courseSlug: row.courseSlug,
		courseTitle: row.courseTitle,
		title: row.title,
		bunnyVideoId: row.bunnyVideoId,
		bodyMd: row.bodyMd,
		isPlayable: playable,
	};
}

export interface CurriculumLesson {
	id: string;
	title: string;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	sortOrder: number;
}

export interface CurriculumModule {
	id: string;
	title: string;
	sortOrder: number;
	lessons: CurriculumLesson[];
}

export interface GetCourseCurriculumOptions {
	/**
	 * Include modules that contain zero lessons. Default `true` for admin views.
	 * Public views should pass `false` to hide empty modules from learners.
	 */
	includeEmptyModules?: boolean;
}

export async function getCourseCurriculum(
	courseId: string,
	options: GetCourseCurriculumOptions = {},
): Promise<CurriculumModule[]> {
	const { includeEmptyModules = true } = options;
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

	const lessons = await db
		.select({
			id: lesson.id,
			moduleId: lesson.moduleId,
			title: lesson.title,
			durationSeconds: lesson.durationSeconds,
			isPreview: lesson.isPreview,
			isFree: lesson.isFree,
			sortOrder: lesson.sortOrder,
		})
		.from(lesson)
		.where(and(isNull(lesson.deletedAt), inArray(lesson.moduleId, moduleIds)))
		.orderBy(asc(lesson.sortOrder));

	const byModule = new Map<string, CurriculumLesson[]>();
	for (const l of lessons) {
		const list = byModule.get(l.moduleId) ?? [];
		list.push({
			id: l.id,
			title: l.title,
			durationSeconds: l.durationSeconds,
			isPreview: l.isPreview,
			isFree: l.isFree,
			sortOrder: l.sortOrder,
		});
		byModule.set(l.moduleId, list);
	}

	const result = modules.map((m) => ({
		id: m.id,
		title: m.title,
		sortOrder: m.sortOrder,
		lessons: byModule.get(m.id) ?? [],
	}));

	if (!includeEmptyModules) {
		return result.filter((m) => m.lessons.length > 0);
	}
	return result;
}

/**
 * Returns true when the given user has any non-cancelled enrollment for the
 * given course. Used by /courses/[slug] to swap "ลงทะเบียน" → "เข้าเรียน"
 * once the student is in.
 */
export async function isUserEnrolledInCourse(
	userId: string,
	courseId: string,
): Promise<boolean> {
	const rows = await db
		.select({ id: enrollment.id })
		.from(enrollment)
		.where(
			and(
				eq(enrollment.userId, userId),
				eq(enrollment.courseId, courseId),
				eq(enrollment.status, "active"),
			),
		)
		.limit(1);
	return rows.length > 0;
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

import "server-only";
import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notDeleted } from "@/db/predicates";
import {
	course,
	type CourseStatus,
	type CourseStatusFilter,
} from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { enrollmentCountSubq } from "./course-queries";
import {
	normalizeCoursePrice,
	normalizeCoursePriceRequired,
} from "@/server/services/course-price";

export interface AdminCourseListItem {
	id: string;
	slug: string;
	title: string;
	status: CourseStatus;
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
	status?: CourseStatusFilter;
}

export async function listAdminCourses(
	options: ListAdminCoursesOptions = {},
): Promise<AdminCourseListItem[]> {
	const conditions = [notDeleted(course)];

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

	return rows.map((r) => ({
		...r,
		// DB CHECK constraint guarantees this is a CourseStatus.
		status: r.status as CourseStatus,
		enrollmentCount: r.enrollmentCount ?? 0,
	}));
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
				notDeleted(course),
				notInArray(course.id, enrolledIds),
			)
		: and(eq(course.status, "published"), notDeleted(course));

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
		.where(and(eq(course.id, courseId), notDeleted(course)))
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
	const { price, isFree } = normalizeCoursePriceRequired({
		price: input.price,
		isFree: input.isFree,
	});
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
	const normalised = normalizeCoursePrice({
		price: input.price,
		isFree: input.isFree,
	});
	const updates: typeof input = {
		...input,
		...(normalised.price !== undefined ? { price: normalised.price } : {}),
		...(normalised.isFree !== undefined ? { isFree: normalised.isFree } : {}),
	};

	await db
		.update(course)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(course.id, courseId));
}

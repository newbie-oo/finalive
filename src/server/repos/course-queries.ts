import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { coverImageUrl } from "@/lib/media-url";

// ─── Shared subqueries ───

/** Active enrollments per course. Reused by public and admin list queries. */
export const enrollmentCountSubq = db
	.select({
		courseId: enrollment.courseId,
		count: sql<number>`count(*)::int`.as("enrollment_count"),
	})
	.from(enrollment)
	.where(sql`${enrollment.status} = 'active'`)
	.groupBy(enrollment.courseId)
	.as("enrollment_count");

// ─── Shared row mappers ───

export interface CourseListRow {
	id: string;
	slug: string;
	title: string;
	summary: string;
	price: string;
	isFree: boolean;
	status: string;
	publishedAt: Date | null;
	coverStorageKey: string | null;
	enrollmentCount: number | null;
}

export function mapToPublicCourseSummary(row: CourseListRow): {
	id: string;
	slug: string;
	title: string;
	summary: string;
	price: string;
	isFree: boolean;
	status: string;
	publishedAt: Date | null;
	coverStorageKey: string | null;
	coverImageUrl: string | null;
	enrollmentCount: number;
} {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		price: row.price,
		isFree: row.isFree,
		status: row.status,
		publishedAt: row.publishedAt,
		coverStorageKey: row.coverStorageKey ?? null,
		coverImageUrl: coverImageUrl(row.coverStorageKey),
		enrollmentCount: row.enrollmentCount ?? 0,
	};
}

export function mapToAdminCourseListItem(
	row: CourseListRow & { createdAt: Date },
): {
	id: string;
	slug: string;
	title: string;
	status: string;
	isFree: boolean;
	price: string;
	publishedAt: Date | null;
	createdAt: Date;
	enrollmentCount: number;
} {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		status: row.status,
		isFree: row.isFree,
		price: row.price,
		publishedAt: row.publishedAt,
		createdAt: row.createdAt,
		enrollmentCount: row.enrollmentCount ?? 0,
	};
}

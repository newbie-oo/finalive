import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import { lessonProgress } from "@/db/schema/progress";

export interface StudentEnrollmentItemRaw {
	enrollmentId: string;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
	coverStorageKey: string | null;
	totalLessons: number;
	doneLessons: number;
	completedAt: Date | null;
}

export const StudentEnrollmentRepo = {
	async listWithProgress(userId: string): Promise<StudentEnrollmentItemRaw[]> {
		const lessonCountByCourse = db
			.select({
				courseId: courseModule.courseId,
				total: sql<number>`count(*)::int`.as("total_lessons"),
			})
			.from(lesson)
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.where(
				sql`${lesson.deletedAt} IS NULL AND ${courseModule.deletedAt} IS NULL`,
			)
			.groupBy(courseModule.courseId)
			.as("lesson_count_by_course");

		const doneByCourse = db
			.select({
				courseId: courseModule.courseId,
				done: sql<number>`count(*)::int`.as("done_lessons"),
			})
			.from(lessonProgress)
			.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.where(
				and(
					eq(lessonProgress.userId, userId),
					eq(lessonProgress.status, "completed"),
				),
			)
			.groupBy(courseModule.courseId)
			.as("done_by_course");

		const rows = await db
			.select({
				enrollmentId: enrollment.id,
				courseId: course.id,
				courseSlug: course.slug,
				courseTitle: course.title,
				coverStorageKey: mediaAsset.storageKey,
				totalLessons: lessonCountByCourse.total,
				doneLessons: doneByCourse.done,
				completedAt: enrollment.completedAt,
			})
			.from(enrollment)
			.innerJoin(course, eq(enrollment.courseId, course.id))
			.leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
			.leftJoin(
				lessonCountByCourse,
				eq(lessonCountByCourse.courseId, course.id),
			)
			.leftJoin(doneByCourse, eq(doneByCourse.courseId, course.id))
			.where(eq(enrollment.userId, userId))
			.orderBy(desc(enrollment.createdAt))
			.limit(50);

		return rows.map((r) => ({
			enrollmentId: r.enrollmentId,
			courseId: r.courseId,
			courseSlug: r.courseSlug,
			courseTitle: r.courseTitle,
			coverStorageKey: r.coverStorageKey ?? null,
			totalLessons: r.totalLessons ?? 0,
			doneLessons: r.doneLessons ?? 0,
			completedAt: r.completedAt,
		}));
	},
};

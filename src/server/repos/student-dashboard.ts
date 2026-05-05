import "server-only";
import { and, count, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { certificate } from "@/db/schema/certificate";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";

export interface StudentDashboardData {
	enrollments: StudentEnrollmentItem[];
	totalWatchedSeconds: number;
	certCount: number;
	completedCourses: number;
	recentActivity: RecentActivityItem[];
}

export interface StudentEnrollmentItem {
	enrollmentId: string;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
	coverStorageKey: string | null;
	totalLessons: number;
	doneLessons: number;
	completedAt: Date | null;
}

export interface RecentActivityItem {
	type:
		| "lesson_complete"
		| "quiz_pass"
		| "quiz_fail"
		| "course_complete"
		| "enroll";
	title: string;
	meta?: string;
	at: Date;
}

export async function getStudentDashboardData(
	userId: string,
): Promise<StudentDashboardData> {
	// Enrollments with progress
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

	const enrollments = await db
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
		.leftJoin(lessonCountByCourse, eq(lessonCountByCourse.courseId, course.id))
		.leftJoin(doneByCourse, eq(doneByCourse.courseId, course.id))
		.where(eq(enrollment.userId, userId))
		.orderBy(desc(enrollment.createdAt))
		.limit(50);

	// Total watched seconds
	const watchedRows = await db
		.select({
			total: sql<number>`coalesce(sum(${lessonProgress.watchedSeconds}), 0)::int`,
		})
		.from(lessonProgress)
		.where(eq(lessonProgress.userId, userId));

	// Certificates
	const certRows = await db
		.select({ count: count() })
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.where(eq(enrollment.userId, userId));

	// Recent activity: completed lessons
	const recentLessons = await db
		.select({
			lessonTitle: lesson.title,
			courseTitle: course.title,
			at: lessonProgress.updatedAt,
		})
		.from(lessonProgress)
		.innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.innerJoin(course, eq(courseModule.courseId, course.id))
		.where(
			and(
				eq(lessonProgress.userId, userId),
				eq(lessonProgress.status, "completed"),
			),
		)
		.orderBy(desc(lessonProgress.updatedAt))
		.limit(10);

	// Recent quiz attempts
	const recentQuizzes = await db
		.select({
			quizTitle: quiz.title,
			courseTitle: course.title,
			passed: quizAttempt.passed,
			scorePct: quizAttempt.scorePct,
			at: quizAttempt.submittedAt,
		})
		.from(quizAttempt)
		.innerJoin(quiz, eq(quizAttempt.quizId, quiz.id))
		.innerJoin(lesson, eq(quiz.lessonId, lesson.id))
		.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
		.innerJoin(course, eq(courseModule.courseId, course.id))
		.where(eq(quizAttempt.userId, userId))
		.orderBy(desc(quizAttempt.submittedAt))
		.limit(10);

	// Recent completed courses
	const recentCompleted = await db
		.select({
			courseTitle: course.title,
			at: enrollment.completedAt,
		})
		.from(enrollment)
		.innerJoin(course, eq(enrollment.courseId, course.id))
		.where(
			and(
				eq(enrollment.userId, userId),
				sql`${enrollment.completedAt} IS NOT NULL`,
			),
		)
		.orderBy(desc(enrollment.completedAt))
		.limit(10);

	// Merge and sort recent activity
	const activity: RecentActivityItem[] = [
		...recentLessons.map(
			(l): RecentActivityItem => ({
				type: "lesson_complete",
				title: l.lessonTitle,
				meta: l.courseTitle,
				at: l.at,
			}),
		),
		...recentQuizzes.map(
			(q): RecentActivityItem => ({
				type: q.passed ? "quiz_pass" : "quiz_fail",
				title: q.quizTitle,
				meta: `${q.scorePct}% · ${q.courseTitle}`,
				at: q.at,
			}),
		),
		...recentCompleted.map(
			(c): RecentActivityItem => ({
				type: "course_complete",
				title: c.courseTitle,
				at: c.at!,
			}),
		),
	]
		.sort((a, b) => b.at.getTime() - a.at.getTime())
		.slice(0, 10);

	return {
		enrollments: enrollments.map((r) => ({
			enrollmentId: r.enrollmentId,
			courseId: r.courseId,
			courseSlug: r.courseSlug,
			courseTitle: r.courseTitle,
			coverStorageKey: r.coverStorageKey ?? null,
			totalLessons: r.totalLessons ?? 0,
			doneLessons: r.doneLessons ?? 0,
			completedAt: r.completedAt,
		})),
		totalWatchedSeconds: watchedRows[0]?.total ?? 0,
		certCount: certRows[0]?.count ?? 0,
		completedCourses: enrollments.filter((e) => e.completedAt).length,
		recentActivity: activity,
	};
}

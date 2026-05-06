import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { enrollment } from "@/db/schema/enrollment";
import { course, courseModule, lesson } from "@/db/schema/course";
import { quiz } from "@/db/schema/quiz";

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

export const StudentActivityRepo = {
	async getRecent(userId: string, limit = 10): Promise<RecentActivityItem[]> {
		const [recentLessons, recentQuizzes, recentCompleted] = await Promise.all([
			db
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
				.limit(limit),
			db
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
				.limit(limit),
			db
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
				.limit(limit),
		]);

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
		];

		activity.sort((a, b) => b.at.getTime() - a.at.getTime());
		return activity.slice(0, limit);
	},
};

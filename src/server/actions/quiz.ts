"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";
import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { CourseCompletionService } from "@/server/services/course-completion";

const submitSchema = z.object({
	quizId: z.string().uuid(),
	answers: z.record(z.string().uuid(), z.string().uuid()),
});

function makeCompletionService() {
	return new CourseCompletionService({
		markLessonComplete: async () => {},
		getCourseIdByLessonId: async () => null,
		checkAndMarkCourseComplete,
		certificateIssuer: {
			issue: async (
				enrollmentId,
				requestingUserId,
				requestingUserRole,
				requestingUserEmail,
			) => {
				const { CertificateIssuer } = await import(
					"@/server/certificates/certificate-issuer"
				);
				const { ReactPdfCertificateRenderer } = await import(
					"@/server/certificates/certificate-renderer"
				);
				const { R2ObjectStorage } = await import("@/server/services/storage");
				const { EmailCourseCompletionNotifier } = await import(
					"@/server/services/notifier"
				);
				const issuer = new CertificateIssuer({
					renderer: new ReactPdfCertificateRenderer(),
					storage: new R2ObjectStorage("public"),
					notifier: new EmailCourseCompletionNotifier(),
				});
				return issuer.issue(
					enrollmentId,
					requestingUserId,
					requestingUserRole,
					requestingUserEmail,
				);
			},
		},
	});
}

export async function submitQuizAction(formData: FormData) {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const quizId = formData.get("quizId") as string;
	const answersJson = formData.get("answers") as string;

	let answers: Record<string, string>;
	try {
		answers = JSON.parse(answersJson);
	} catch {
		return { ok: false, error: "invalid_answers" as const };
	}

	const parsed = submitSchema.safeParse({ quizId, answers });
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const quiz = await getQuizById(quizId);
	if (!quiz) {
		return { ok: false, error: "quiz_not_found" as const };
	}

	const result = await submitQuizAttempt({
		userId: session.user.id,
		quizId,
		answers,
	});

	if (result.passed) {
		const lessonRow = await db
			.select({ courseId: courseModule.courseId })
			.from(lesson)
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.where(eq(lesson.id, quiz.lessonId))
			.limit(1);
		const courseId = lessonRow[0]?.courseId;
		if (courseId) {
			const service = makeCompletionService();
			await service.reevaluateCourseCompletion({
				userId: session.user.id,
				userEmail: session.user.email,
				userRole: session.user.role,
				courseId,
			});
		}
	}

	return { ok: true, result };
}

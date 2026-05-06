"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCourseIdByLessonId } from "@/server/repos/course";
import {
	getAdminQuizById,
	saveAdminQuiz,
	createAdminQuiz,
	type AdminQuiz,
} from "@/server/repos/admin-quiz";
import {
	adminAction,
	jsonParser,
	requireCourseAccess,
} from "@/server/admin/admin-command";

const saveQuizSchema = z.object({
	quizId: z.string().uuid(),
	passScorePct: z.number().int().min(1).max(100).default(60),
	questions: z
		.array(
			z.object({
				id: z.string().uuid().optional(),
				promptMd: z.string().min(1).max(2000),
				choices: z
					.array(
						z.object({
							id: z.string().uuid().optional(),
							body: z.string().min(1).max(500),
							isCorrect: z.boolean(),
						}),
					)
					.min(2)
					.max(6),
			}),
		)
		.min(1)
		.max(50),
});

type SaveQuizResult =
	| { ok: true; quiz: AdminQuiz }
	| {
			ok: false;
			error: "unauthorized" | "invalid_input" | "not_found" | "forbidden";
	  };

export const saveQuizAction = adminAction(
	jsonParser(saveQuizSchema),
	async ({ session, input }): Promise<SaveQuizResult> => {
		const quiz = await getAdminQuizById(input.quizId);
		if (!quiz) {
			return { ok: false, error: "not_found" };
		}

		const access = await requireCourseAccess(session, quiz.courseId);
		if (!access.ok) return { ok: false, error: access.error };

		await saveAdminQuiz(input.quizId, {
			passScorePct: input.passScorePct ?? 60,
			questions: input.questions,
		});

		const fresh = await getAdminQuizById(input.quizId);
		if (!fresh) {
			return { ok: false, error: "not_found" };
		}

		revalidatePath(`/admin/courses/${quiz.courseId}/quizzes/${quiz.id}`);
		revalidatePath(`/admin/courses/${quiz.courseId}/curriculum`);

		return { ok: true, quiz: fresh };
	},
);

const createQuizSchema = z.object({
	lessonId: z.string().uuid(),
	title: z.string().min(1).max(200),
	passScorePct: z.number().int().min(1).max(100).default(60),
});

export const createQuizAction = adminAction(
	jsonParser(createQuizSchema),
	async ({ session, input }) => {
		const courseId = await getCourseIdByLessonId(input.lessonId);
		if (!courseId) {
			return { ok: false as const, error: "not_found" as const };
		}

		const access = await requireCourseAccess(session, courseId);
		if (!access.ok) return { ok: false, error: access.error };

		const quizId = await createAdminQuiz({
			lessonId: input.lessonId,
			title: input.title,
			passScorePct: input.passScorePct ?? 60,
			createdByUserId: session.user.id,
		});

		revalidatePath(`/admin/courses/${courseId}/curriculum`);
		return { ok: true as const, quizId };
	},
);

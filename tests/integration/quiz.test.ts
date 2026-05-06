import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { quiz, quizQuestion, quizChoice } from "@/db/schema/quiz";
import {
	getQuizById,
	getCorrectChoices,
	insertQuizAttempt,
} from "@/server/repos/quiz";

async function reset() {
	await db.execute(sql`
    TRUNCATE quiz_attempt, quiz_choice, quiz_question, quiz, lesson, module, course, "user" CASCADE
  `);
}

async function seedQuiz() {
	const adminId = randomUUID();
	await db.insert(userTable).values({
		id: adminId,
		email: "admin@test",
		name: "Admin",
		role: "admin",
	});

	const [c] = await db
		.insert(course)
		.values({
			slug: "quiz-course",
			title: "Quiz Course",
			summary: "S",
			ownerUserId: adminId,
			status: "published",
			createdByUserId: adminId,
		})
		.returning({ id: course.id });

	const [mod] = await db
		.insert(courseModule)
		.values({
			courseId: c!.id,
			title: "Module 1",
			sortOrder: 1,
			createdByUserId: adminId,
		})
		.returning({ id: courseModule.id });

	const [ls] = await db
		.insert(lesson)
		.values({
			moduleId: mod!.id,
			title: "Lesson 1",
			sortOrder: 1,
			bodyMd: "# Lesson 1\n\nContent.",
			createdByUserId: adminId,
		})
		.returning({ id: lesson.id });

	const [qz] = await db
		.insert(quiz)
		.values({
			lessonId: ls!.id,
			title: "Quiz 1",
			passScorePct: 60,
			createdByUserId: adminId,
		})
		.returning({ id: quiz.id });

	const [q1] = await db
		.insert(quizQuestion)
		.values({
			quizId: qz!.id,
			promptMd: "What is 2+2?",
			sortOrder: 1,
		})
		.returning({ id: quizQuestion.id });

	const [q2] = await db
		.insert(quizQuestion)
		.values({
			quizId: qz!.id,
			promptMd: "What is 3+3?",
			sortOrder: 2,
		})
		.returning({ id: quizQuestion.id });

	const [c1] = await db
		.insert(quizChoice)
		.values({
			questionId: q1!.id,
			body: "4",
			isCorrect: true,
			sortOrder: 1,
		})
		.returning({ id: quizChoice.id });

	const [c2] = await db
		.insert(quizChoice)
		.values({
			questionId: q1!.id,
			body: "5",
			isCorrect: false,
			sortOrder: 2,
		})
		.returning({ id: quizChoice.id });

	const [c3] = await db
		.insert(quizChoice)
		.values({
			questionId: q2!.id,
			body: "6",
			isCorrect: true,
			sortOrder: 1,
		})
		.returning({ id: quizChoice.id });

	const [c4] = await db
		.insert(quizChoice)
		.values({
			questionId: q2!.id,
			body: "7",
			isCorrect: false,
			sortOrder: 2,
		})
		.returning({ id: quizChoice.id });

	return {
		quizId: qz!.id,
		questions: [
			{ id: q1!.id, correctChoiceId: c1!.id, wrongChoiceId: c2!.id },
			{ id: q2!.id, correctChoiceId: c3!.id, wrongChoiceId: c4!.id },
		],
	};
}

describe("quiz repo", () => {
	beforeEach(reset);

	it("getQuizById returns quiz with questions and choices", async () => {
		const { quizId } = await seedQuiz();
		const result = await getQuizById(quizId);
		expect(result).not.toBeNull();
		expect(result!.title).toBe("Quiz 1");
		expect(result!.questions.length).toBe(2);
		expect(result!.questions[0]!.choices.length).toBe(2);
		expect(result!.questions[0]!.choices.map((c) => c.body)).toContain("4");
		expect(result!.questions[1]!.choices.map((c) => c.body)).toContain("6");
	});

	it("getCorrectChoices returns only correct answers", async () => {
		const { quizId, questions } = await seedQuiz();
		const rows = await getCorrectChoices(quizId);
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.choiceId)).toContain(
			questions[0]!.correctChoiceId,
		);
		expect(rows.map((r) => r.choiceId)).toContain(
			questions[1]!.correctChoiceId,
		);
	});

	it("insertQuizAttempt stores scored attempt", async () => {
		const studentId = randomUUID();
		await db.insert(userTable).values({
			id: studentId,
			email: "s@test",
			name: "Student",
			role: "user",
		});

		const { quizId } = await seedQuiz();
		const result = await insertQuizAttempt({
			userId: studentId,
			quizId,
			answersJson: { q1: "a1", q2: "a2" },
			scorePct: 75,
			passed: true,
		});
		expect(result.attemptId).toBeTruthy();
	});
});

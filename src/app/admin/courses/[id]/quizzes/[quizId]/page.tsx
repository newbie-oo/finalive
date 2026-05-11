import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminQuizById } from "@/server/repos/admin-quiz";
import { QuizBuilder } from "@/components/admin/quiz-builder";

export const dynamic = "force-dynamic";

export default async function AdminQuizEditPage({
	params,
}: {
	params: Promise<{ id: string; quizId: string }>;
}) {
	const { id, quizId } = await params;

	const quiz = await getAdminQuizById(quizId);
	if (!quiz) notFound();

	return (
		<div className="mx-auto max-w-3xl p-6">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">แก้ไขแบบทดสอบ</h1>
					<p className="text-sm text-muted-foreground">{quiz.title}</p>
				</div>
				<Link
					href={`/admin/courses/${id}/curriculum`}
					className="text-sm text-primary hover:underline"
				>
					← กลับไปเนื้อหา
				</Link>
			</div>

			<QuizBuilder
				quizId={quizId}
				initialPassScorePct={quiz.passScorePct}
				initialQuestions={quiz.questions}
			/>
		</div>
	);
}

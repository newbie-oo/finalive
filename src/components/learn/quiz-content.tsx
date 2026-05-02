"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { QuizForm } from "./quiz-form";
import type { QuizWithQuestions } from "@/server/repos/quiz";

interface QuizContentProps {
	courseSlug: string;
	courseTitle: string;
	quiz: QuizWithQuestions;
	nextLessonId: string | null;
}

export function QuizContent({
	courseSlug,
	courseTitle,
	quiz,
	nextLessonId,
}: QuizContentProps) {
	return (
		<>
			{/* Quiz header */}
			<header className="flex h-14 shrink-0 items-center justify-between border-b border-(--border) bg-(--background) px-4 lg:px-6">
				<Link
					href={`/learn/${courseSlug}/${quiz.lessonId}`}
					className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-uism text-(--foreground) transition-colors hover:bg-(--surface-muted)"
				>
					<X size={16} />
					ออกจากแบบทดสอบ
				</Link>
				<div className="text-caption text-(--foreground-muted) flex items-center gap-1.5">
					<span className="num">{quiz.questions.length}</span> ข้อ · ผ่าน{" "}
					<span className="num">{quiz.passScorePct}%</span>
				</div>
			</header>

			<main className="mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
				{/* Breadcrumb + title */}
				<div className="mb-5">
					<div className="text-caption text-(--foreground-muted) mb-1.5 flex items-center gap-1.5">
						<span className="text-(--primary)">{courseTitle}</span>
						<span>/</span>
						<span>บทที่ {quiz.lessonTitle}</span>
					</div>
					<h1 className="text-h2 mb-1.5">{quiz.title}</h1>
					<p className="text-caption text-(--foreground-muted)">
						<span className="num">{quiz.questions.length}</span> ข้อ · ผ่าน{" "}
						<span className="num">{quiz.passScorePct}%</span> · ทำได้ไม่จำกัด
					</p>
				</div>

				<QuizForm
					quiz={quiz}
					courseSlug={courseSlug}
					nextLessonId={nextLessonId}
				/>
			</main>
		</>
	);
}

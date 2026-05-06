"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createQuizAction } from "@/server/actions/admin-quiz";
import type { AdminCurriculumLesson } from "@/server/repos/admin-course";

export function LessonQuizInlineAction({
	courseId,
	lesson,
}: {
	courseId: string;
	lesson: AdminCurriculumLesson;
}) {
	const router = useRouter();
	const [creating, startCreate] = useTransition();

	if (lesson.quizId) {
		return (
			<Link
				href={`/admin/courses/${courseId}/quizzes/${lesson.quizId}`}
				className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] text-success hover:bg-success/30"
				title="แก้ไขแบบทดสอบ"
			>
				ข้อสอบ →
			</Link>
		);
	}

	return (
		<button
			type="button"
			disabled={creating}
			onClick={() => {
				const defaultTitle = `แบบทดสอบ: ${lesson.title}`;
				const title = window.prompt(
					`สร้างแบบทดสอบสำหรับ "${lesson.title}"\nกรอกชื่อแบบทดสอบ (Enter เพื่อใช้ค่าเริ่มต้น):`,
					defaultTitle,
				);
				if (title === null) return;
				const finalTitle = title.trim() || defaultTitle;
				const passInput = window.prompt(
					"คะแนนขั้นต่ำผ่าน (%) — กรอกระหว่าง 1–100:",
					"60",
				);
				if (passInput === null) return;
				const passScorePct = Math.max(
					1,
					Math.min(100, parseInt(passInput, 10) || 60),
				);

				startCreate(async () => {
					const result = await createQuizAction({
						lessonId: lesson.id,
						title: finalTitle,
						passScorePct,
					});
					if (result.ok && result.quizId) {
						toast.success("สร้างแบบทดสอบสำเร็จ");
						router.push(`/admin/courses/${courseId}/quizzes/${result.quizId}`);
					} else {
						toast.error("สร้างแบบทดสอบไม่สำเร็จ");
					}
				});
			}}
			className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
			title="สร้างแบบทดสอบให้บทเรียนนี้"
		>
			{creating ? "กำลังสร้าง…" : "+ ข้อสอบ"}
		</button>
	);
}

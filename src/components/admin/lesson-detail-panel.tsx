"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { MarkdownView } from "@/lib/markdown";
import type { AdminCurriculumLesson } from "@/server/repos/admin-curriculum";

export function LessonDetailPanel({
	courseId,
	lesson,
}: {
	courseId: string;
	lesson: AdminCurriculumLesson;
}) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h3 className="truncate text-lg font-medium">{lesson.title}</h3>
				<Button size="sm" variant="primary" asChild>
					<Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
						เปิดตัวแก้ไข →
					</Link>
				</Button>
			</div>

			<dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
				<dt className="text-muted-foreground">ความยาว</dt>
				<dd>
					{lesson.durationSeconds
						? formatDuration(lesson.durationSeconds)
						: "—"}
				</dd>

				<dt className="text-muted-foreground">วิดีโอ</dt>
				<dd>{lesson.bunnyVideoId ? "มีวิดีโอ" : "ยังไม่มีวิดีโอ"}</dd>

				<dt className="text-muted-foreground">สิทธิ์</dt>
				<dd>
					{lesson.isPreview && lesson.isFree
						? "ตัวอย่างฟรี + เปิดให้ทุกคน"
						: lesson.isPreview
							? "ดูตัวอย่างได้"
							: lesson.isFree
								? "เปิดให้ทุกคน"
								: "เฉพาะผู้ลงทะเบียน"}
				</dd>

				<dt className="text-muted-foreground">แบบทดสอบ</dt>
				<dd>
					{lesson.quizId ? (
						<Link
							href={`/admin/courses/${courseId}/quizzes/${lesson.quizId}`}
							className="text-primary hover:underline"
						>
							แก้ไขแบบทดสอบ →
						</Link>
					) : (
						<span className="text-muted-foreground">
							ยังไม่มี — กดปุ่ม “+ ข้อสอบ” ที่บทเรียนเพื่อสร้าง
						</span>
					)}
				</dd>
			</dl>

			{lesson.bodyMd && (
				<div>
					<h4 className="mb-1 text-sm font-medium text-muted-foreground">
						ตัวอย่างเนื้อหา
					</h4>
					<div className="max-h-96 overflow-auto rounded-sm border border-border bg-card p-3 text-sm">
						<MarkdownView text={lesson.bodyMd} />
					</div>
				</div>
			)}
		</div>
	);
}

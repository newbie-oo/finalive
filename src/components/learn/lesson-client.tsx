"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface LessonClientProps {
	lessonId: string;
	courseSlug: string;
	nextLessonId: string | null;
	/** Prefer the quiz CTA over "next lesson" so students take the quiz
	 * before moving on. */
	quizId?: string | null;
	durationSeconds: number | null;
	/** When true, suppress all progress writes — admin previews must not
	 * accrue completion, otherwise the certificate banner activates. */
	isAdmin?: boolean;
}

export function LessonClient({
	lessonId,
	courseSlug,
	nextLessonId,
	quizId,
	durationSeconds,
	isAdmin = false,
}: LessonClientProps) {
	const router = useRouter();
	const [completed, setCompleted] = useState(false);

	// Call /api/learn/start once on mount — skipped for admin previews.
	useEffect(() => {
		if (isAdmin) return;
		let cancelled = false;
		fetch("/api/learn/start", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ lessonId }),
		})
			.then((res) => {
				if (!cancelled && !res.ok) {
					// Network error — lesson start will retry on next visit.
				}
			})
			.catch(() => {
				// Network error — lesson start will retry on next visit.
			});
		return () => {
			cancelled = true;
		};
	}, [lessonId, isAdmin]);

	const handleMarkComplete = async () => {
		if (isAdmin) {
			toast.info("admin preview — ไม่บันทึกความคืบหน้า");
			return;
		}
		try {
			const res = await fetch("/api/learn/progress", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					lessonId,
					watchedSeconds: durationSeconds ?? 0,
					markComplete: true,
				}),
			});
			if (!res.ok) throw new Error("failed");
			setCompleted(true);
			toast.success("จบบทเรียนแล้ว");
			router.refresh();
		} catch {
			toast.error("บันทึกไม่สำเร็จ");
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Button
				onClick={handleMarkComplete}
				disabled={completed}
				variant={completed ? "secondary" : "primary"}
				size="md"
			>
				{completed ? (
					<>
						<CheckCircle size={16} weight="fill" /> จบบทเรียนแล้ว
					</>
				) : (
					"ทำเครื่องหมายว่าจบแล้ว"
				)}
			</Button>
			{completed && quizId && (
				<Button asChild variant="primary" size="md">
					<Link href={`/learn/${courseSlug}/quiz/${quizId}`}>
						ทำแบบทดสอบ <ArrowRight size={14} weight="bold" />
					</Link>
				</Button>
			)}
			{completed && !quizId && nextLessonId && (
				<Button asChild variant="ghost" size="md">
					<Link href={`/learn/${courseSlug}/${nextLessonId}`}>
						บทถัดไป <ArrowRight size={14} weight="bold" />
					</Link>
				</Button>
			)}
		</div>
	);
}

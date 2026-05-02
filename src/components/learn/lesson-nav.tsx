"use client";

import Link from "next/link";
import { CaretLeft, CaretRight, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface LessonNavProps {
	courseSlug: string;
	prevLessonId: string | null;
	nextLessonId: string | null;
	quizId: string | null;
	onMarkComplete: () => void;
	completed: boolean;
}

export function LessonNav({
	courseSlug,
	prevLessonId,
	nextLessonId,
	quizId,
	onMarkComplete,
	completed,
}: LessonNavProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border) pt-6">
			{prevLessonId ? (
				<Button asChild variant="secondary" size="md">
					<Link
						href={`/learn/${courseSlug}/${prevLessonId}`}
						prefetch
						scroll={false}
					>
						<CaretLeft size={14} />
						บทก่อนหน้า
					</Link>
				</Button>
			) : (
				<div />
			)}

			<div className="flex flex-wrap gap-2">
				<Button
					onClick={onMarkComplete}
					disabled={completed}
					variant={completed ? "secondary" : "ghost"}
					size="md"
				>
					{completed ? (
						<>
							ทำเครื่องหมายว่าเรียนแล้ว
							<Check size={14} weight="bold" />
						</>
					) : (
						"ทำเครื่องหมายว่าเรียนแล้ว"
					)}
				</Button>

				{nextLessonId ? (
					<Button asChild variant="primary" size="md">
						<Link
							href={`/learn/${courseSlug}/${nextLessonId}`}
							prefetch
							scroll={false}
						>
							บทถัดไป
							<CaretRight size={14} weight="bold" />
						</Link>
					</Button>
				) : quizId ? (
					<Button asChild variant="primary" size="md">
						<Link
							href={`/learn/${courseSlug}/quiz/${quizId}`}
							prefetch
							scroll={false}
						>
							ทำแบบทดสอบ
							<CaretRight size={14} weight="bold" />
						</Link>
					</Button>
				) : null}
			</div>
		</div>
	);
}

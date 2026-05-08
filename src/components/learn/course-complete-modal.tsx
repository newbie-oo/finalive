"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	X,
	Trophy,
	ArrowRight,
	LinkedinLogo,
	BookOpen,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/ui/confetti-burst";

interface CourseCompleteModalProps {
	courseSlug: string;
	/** Course title shown in the celebratory headline. */
	courseTitle?: string;
	/** Total lessons in the course. Modal only fires when reached. */
	totalLessons: number;
	doneLessons: number;
}

const STORAGE_PREFIX = "finalive:cert-shown:";

function readShown(courseSlug: string): boolean {
	if (typeof window === "undefined") return true;
	return !!window.localStorage.getItem(`${STORAGE_PREFIX}${courseSlug}`);
}

/**
 * Full-screen celebration the first time a student crosses 100%.
 * Replaces the previous small dialog — this is the peak moment of the
 * product so it gets the full screen, confetti (motion-reduced safe),
 * and three clear next-actions: download cert, share to LinkedIn, browse
 * more courses. Persistence + Escape behaviour unchanged.
 */
export function CourseCompleteModal({
	courseSlug,
	courseTitle,
	totalLessons,
	doneLessons,
}: CourseCompleteModalProps) {
	const [dismissed, setDismissed] = useState<boolean>(() =>
		readShown(courseSlug),
	);

	const completed = totalLessons > 0 && doneLessons >= totalLessons;
	const open = completed && !dismissed;

	useEffect(() => {
		if (!open) return;
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			`${STORAGE_PREFIX}${courseSlug}`,
			String(Date.now()),
		);
	}, [open, courseSlug]);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDismissed(true);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open]);

	if (!open) return null;

	const headline = courseTitle
		? `คุณจบ ${courseTitle} แล้ว 🎓`
		: "คุณจบคอร์สแล้ว 🎓";
	const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
		`${typeof window === "undefined" ? "" : window.location.origin}/account/certificates`,
	)}`;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="course-complete-title"
			className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-background"
		>
			<ConfettiBurst pieces={36} />

			<button
				type="button"
				aria-label="ปิด"
				onClick={() => setDismissed(true)}
				className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<X size={18} weight="bold" />
			</button>

			<div className="relative mx-auto flex max-w-[640px] flex-col items-center gap-5 px-6 py-12 text-center">
				<div className="flex h-28 w-28 items-center justify-center rounded-full bg-success/10 text-success">
					<Trophy size={64} weight="fill" />
				</div>
				<h1
					id="course-complete-title"
					className="text-display font-bold text-foreground"
				>
					{headline}
				</h1>
				<p className="max-w-md text-bodylg text-muted-foreground">
					ขอบคุณที่ตั้งใจเรียนตลอดคอร์ส — ใบประกาศของคุณพร้อมแล้ว
				</p>

				<div className="mt-3 flex w-full flex-col items-stretch gap-2 sm:max-w-md sm:flex-row sm:items-center sm:justify-center">
					<Button asChild variant="accent" size="lg" className="flex-1">
						<Link href="/account/certificates">
							ดูใบประกาศ <ArrowRight size={16} weight="bold" />
						</Link>
					</Button>
					<Button asChild variant="secondary" size="lg" className="flex-1">
						<a
							href={linkedInShareUrl}
							target="_blank"
							rel="noreferrer noopener"
						>
							<LinkedinLogo size={16} weight="bold" /> แชร์บน LinkedIn
						</a>
					</Button>
				</div>
				<Button asChild variant="ghost" size="md">
					<Link href="/courses">
						<BookOpen size={14} weight="bold" /> เริ่มคอร์สถัดไป
					</Link>
				</Button>
			</div>
		</div>
	);
}

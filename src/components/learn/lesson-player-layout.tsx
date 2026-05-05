"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MarkdownView } from "@/lib/markdown";
import { LessonClient } from "./lesson-client";
import { NotesPanel } from "./notes-panel";
import { formatDurationMinutes } from "@/lib/format";
import {
	BookmarkSimple,
	Check,
	ArrowLeft,
	ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export interface LessonPlayerLayoutProps {
	lessonId: string;
	lessonTitle: string;
	moduleTitle: string;
	lessonBodyMd: string | null;
	durationSeconds: number | null;
	totalLessons: number;
	doneLessons: number;
	courseSlug: string;
	nextLessonId: string | null;
	prevLessonId: string | null;
	quizId: string | null;
	isAdmin?: boolean;
	isCompleted?: boolean;
	playerSlot: React.ReactNode;
}

export function LessonPlayerLayout({
	lessonId,
	lessonTitle,
	moduleTitle,
	lessonBodyMd,
	durationSeconds,
	totalLessons,
	doneLessons,
	courseSlug,
	nextLessonId,
	prevLessonId,
	quizId,
	isAdmin = false,
	isCompleted = false,
	playerSlot,
}: LessonPlayerLayoutProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"content" | "notes">("content");
	const [bookmarked, setBookmarked] = useState(false);
	const [localCompleted, setLocalCompleted] = useState(false);
	const completed = localCompleted || isCompleted;

	const handleBookmark = useCallback(() => {
		setBookmarked((v) => !v);
		toast.success(bookmarked ? "ยกเลิกบุ๊กมาร์กแล้ว" : "บุ๊กมาร์กบทเรียนแล้ว");
	}, [bookmarked]);

	const handleMarkComplete = useCallback(async () => {
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
			setLocalCompleted(true);
			toast.success("จบบทเรียนแล้ว");
			// Optimistically update sidebar without reload
			window.dispatchEvent(
				new CustomEvent("lesson-marked-complete", { detail: { lessonId } }),
			);
			router.refresh();
		} catch {
			toast.error("บันทึกไม่สำเร็จ");
		}
	}, [isAdmin, lessonId, durationSeconds, router]);

	return (
		<>
			{/* Player slot */}
			{playerSlot}

			{/* Mobile progress strip */}
			<div className="flex items-center gap-3 border-b border-(--border) px-4 py-3 lg:hidden">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-muted)">
					<div
						className="h-full rounded-full bg-(--primary)"
						style={{
							width: `${totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%`,
						}}
					/>
				</div>
				<span className="num text-caption font-semibold text-(--primary)">
					{totalLessons > 0
						? Math.round((doneLessons / totalLessons) * 100)
						: 0}
					%
				</span>
			</div>

			{/* Lesson header */}
			<div className="px-4 pt-5 lg:px-8 lg:pt-8 max-w-[920px] mx-auto">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<div className="mb-1 text-uism font-semibold text-(--primary)">
							{moduleTitle}
						</div>
						<h1 className="text-h2 mb-1" style={{ margin: 0 }}>
							{lessonTitle}
						</h1>
						<div className="flex flex-wrap items-center gap-3 text-(--foreground-muted)">
							<span className="text-caption flex items-center gap-1">
								<span className="num">
									{formatDurationMinutes(durationSeconds)}
								</span>
							</span>
							<span style={{ color: "var(--border-strong)" }}>·</span>
							<span className="text-caption">{moduleTitle}</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Button
							variant="secondary"
							size="md"
							onClick={handleBookmark}
							aria-label={bookmarked ? "ยกเลิกบุ๊กมาร์ก" : "บุ๊กมาร์ก"}
						>
							<BookmarkSimple
								size={16}
								weight={bookmarked ? "fill" : "regular"}
							/>
						</Button>
						<Button
							onClick={handleMarkComplete}
							disabled={completed}
							variant={completed ? "secondary" : "primary"}
							size="md"
						>
							{completed ? (
								<>
									<Check size={16} weight="bold" /> จบบทเรียนแล้ว
								</>
							) : (
								<>
									<Check size={16} weight="bold" /> ทำเครื่องหมายว่าจบ
								</>
							)}
						</Button>
					</div>
				</div>
			</div>

			{/* Tabs + body */}
			<div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[920px] mx-auto">
				{/* Tabs */}
				<div
					className="flex gap-6 border-b border-(--border) mb-6"
					role="tablist"
					aria-label="บทเรียน"
				>
					<button
						role="tab"
						aria-selected={activeTab === "content"}
						aria-current={activeTab === "content" ? "page" : undefined}
						onClick={() => setActiveTab("content")}
						className={`border-b-2 px-0 py-3 text-ui font-medium transition-colors ${
							activeTab === "content"
								? "border-(--primary) text-(--primary)"
								: "border-transparent text-(--foreground-muted) hover:text-(--foreground)"
						}`}
					>
						เนื้อหา
					</button>
					<button
						role="tab"
						aria-selected={activeTab === "notes"}
						aria-current={activeTab === "notes" ? "page" : undefined}
						onClick={() => setActiveTab("notes")}
						className={`border-b-2 px-0 py-3 text-ui font-medium transition-colors ${
							activeTab === "notes"
								? "border-(--primary) text-(--primary)"
								: "border-transparent text-(--foreground-muted) hover:text-(--foreground)"
						}`}
					>
						โน้ต
					</button>
				</div>

				{activeTab === "notes" ? (
					<NotesPanel lessonId={lessonId} />
				) : (
					<>
						{/* Lesson body */}
						{lessonBodyMd && (
							<article className="prose-style mb-8">
								<MarkdownView text={lessonBodyMd} />
							</article>
						)}

						<LessonClient
							lessonId={lessonId}
							courseSlug={courseSlug}
							nextLessonId={nextLessonId}
							quizId={quizId}
							durationSeconds={durationSeconds}
							isAdmin={isAdmin}
							completed={completed}
						/>
					</>
				)}

				{/* Prev/Next navigation */}
				<div className="mt-8 flex items-center justify-between border-t border-(--border) pt-6">
					{prevLessonId ? (
						<Button variant="secondary" size="md" asChild>
							<Link href={`/learn/${courseSlug}/${prevLessonId}`}>
								<ArrowLeft size={16} /> บทก่อนหน้า
							</Link>
						</Button>
					) : (
						<div />
					)}
					<div />
					{nextLessonId ? (
						<Button variant="primary" size="md" asChild>
							<Link href={`/learn/${courseSlug}/${nextLessonId}`}>
								บทถัดไป <ArrowRight size={16} />
							</Link>
						</Button>
					) : (
						<div />
					)}
				</div>
			</div>
		</>
	);
}

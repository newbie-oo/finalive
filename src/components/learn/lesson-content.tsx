"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { LearnTopbar } from "./learn-topbar";
import { LessonClient } from "./lesson-client";
import { MarkdownView } from "@/lib/markdown";
import { NotesPanel } from "./notes-panel";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "@phosphor-icons/react";
import { useLearnShell } from "./learn-shell-context";

interface LessonContentProps {
	courseSlug: string;
	courseTitle: string;
	lessonId: string;
	lessonTitle: string;
	moduleTitle: string;
	lessonBodyMd: string | null;
	durationSeconds: number | null;
	nextLessonId: string | null;
	prevLessonId: string | null;
	quizId: string | null;
	totalLessons: number;
	doneLessons: number;
	watchedSeconds: number;
	hlsUrl: string | null;
	isAdmin?: boolean;
}

export function LessonContent({
	courseSlug,
	courseTitle,
	lessonId,
	lessonTitle,
	moduleTitle,
	lessonBodyMd,
	durationSeconds,
	nextLessonId,
	prevLessonId: _prevLessonId,
	quizId,
	totalLessons,
	doneLessons,
	watchedSeconds,
	hlsUrl,
	isAdmin = false,
}: LessonContentProps) {
	const router = useRouter();
	const { sidebarOpen, toggleSidebar, toggleMobileDrawer } = useLearnShell();
	const [activeTab, setActiveTab] = useState<"content" | "notes">("content");

	// Autoplay-next countdown state
	const [showCountdown, setShowCountdown] = useState(false);
	const [countdownValue, setCountdownValue] = useState(10);
	const countdownCancelledRef = useRef(false);
	const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Listen for video completion event from VidstackPlayer
	useEffect(() => {
		const handler = (e: Event) => {
			const custom = e as CustomEvent;
			if (custom.detail?.lessonId === lessonId) {
				router.refresh();
			}
		};
		window.addEventListener("lesson-completed", handler);
		return () => window.removeEventListener("lesson-completed", handler);
	}, [router, lessonId]);

	// Start countdown when video ends (if no quiz and next lesson exists)
	const handleVideoEnded = useCallback(() => {
		if (quizId || !nextLessonId) return;
		if (countdownCancelledRef.current) return;
		setShowCountdown(true);
		setCountdownValue(10);

		if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		let remaining = 10;
		countdownTimerRef.current = setInterval(() => {
			remaining -= 1;
			setCountdownValue(remaining);
			if (remaining <= 0) {
				if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
				router.push(`/learn/${courseSlug}/${nextLessonId}`);
			}
		}, 1000);
	}, [quizId, nextLessonId, courseSlug, router]);

	const cancelCountdown = useCallback(() => {
		countdownCancelledRef.current = true;
		setShowCountdown(false);
		if (countdownTimerRef.current) {
			clearInterval(countdownTimerRef.current);
			countdownTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		};
	}, []);

	const handleToggleSidebar = useCallback(() => {
		if (window.innerWidth < 1024) {
			toggleMobileDrawer();
		} else {
			toggleSidebar();
		}
	}, [toggleSidebar, toggleMobileDrawer]);

	return (
		<>
			<LearnTopbar
				courseTitle={courseTitle}
				moduleTitle={moduleTitle}
				lessonTitle={lessonTitle}
				totalLessons={totalLessons}
				doneLessons={doneLessons}
				onToggleSidebar={handleToggleSidebar}
				sidebarOpen={sidebarOpen}
			/>

			<main className="flex-1 overflow-y-auto min-w-0">
				{/* Player */}
				{hlsUrl ? (
					<div className="relative bg-black flex justify-center lg:p-4">
						<div className="w-full">
							<VidstackPlayer
								src={hlsUrl}
								title={lessonTitle}
								currentTime={watchedSeconds}
								lessonId={lessonId}
								nextLessonId={nextLessonId}
								quizId={quizId}
								courseSlug={courseSlug}
								suppressProgress={isAdmin}
								onVideoEnded={handleVideoEnded}
							/>
						</div>

						{/* Autoplay-next countdown overlay */}
						{showCountdown && (
							<div
								data-testid="autoplay-countdown"
								className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
							>
								<p className="text-h3 text-white">
									บทถัดไปใน {countdownValue}...
								</p>
								<div className="mt-4 flex gap-3">
									<Button
										variant="primary"
										size="md"
										onClick={() =>
											router.push(`/learn/${courseSlug}/${nextLessonId}`)
										}
									>
										ไปเลย <ArrowRight size={14} weight="bold" />
									</Button>
									<Button variant="ghost" size="md" onClick={cancelCountdown}>
										<X size={14} weight="bold" /> ยกเลิก
									</Button>
								</div>
							</div>
						)}
					</div>
				) : (
					<div
						role="status"
						className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-(--border) bg-(--surface-muted) px-4 py-3 text-uism text-(--foreground-muted) lg:mx-8 lg:mt-6"
					>
						<span aria-hidden="true">📖</span>
						บทเรียนนี้ไม่มีวิดีโอ — อ่านเนื้อหาด้านล่าง
					</div>
				)}

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

				{/* Tabs + body */}
				<div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[720px] mx-auto">
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
							<article>
								<h1 className="text-h2" style={{ margin: "0 0 8px" }}>
									{lessonTitle}
								</h1>
								<div className="flex flex-wrap items-center gap-3 mb-6 text-(--foreground-muted)">
									<span className="text-caption flex items-center gap-1">
										<span className="num">
											{durationSeconds
												? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`
												: "—"}
										</span>{" "}
										นาที
									</span>
									<span style={{ color: "var(--border-strong)" }}>·</span>
									<span className="text-caption">{moduleTitle}</span>
								</div>

								{lessonBodyMd && (
									<div className="prose-style">
										<MarkdownView text={lessonBodyMd} />
									</div>
								)}
							</article>

							<LessonClient
								lessonId={lessonId}
								courseSlug={courseSlug}
								nextLessonId={nextLessonId}
								quizId={quizId}
								durationSeconds={durationSeconds}
								isAdmin={isAdmin}
							/>
						</>
					)}
				</div>
			</main>
		</>
	);
}

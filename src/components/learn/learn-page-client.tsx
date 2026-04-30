"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LearnTopbar } from "./learn-topbar";
import { MobileCurriculumDrawer } from "./mobile-curriculum-drawer";
import { LessonClient } from "./lesson-client";
import { CourseCompleteModal } from "./course-complete-modal";
import { MarkdownView } from "@/lib/markdown";
import { NotesPanel } from "./notes-panel";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "@phosphor-icons/react";
import type { SidebarModule } from "./curriculum-sidebar";

interface LearnPageClientProps {
	courseSlug: string;
	courseTitle: string;
	lessonId: string;
	lessonTitle: string;
	moduleTitle: string;
	lessonBodyMd: string | null;
	bunnyVideoId: string | null;
	durationSeconds: number | null;
	nextLessonId: string | null;
	prevLessonId: string | null;
	quizId: string | null;
	modules: SidebarModule[];
	progress: Array<{ lessonId: string; status: string }>;
	/** Plain object so the prop is server-component-serialisable. */
	passedQuizIds?: Record<string, boolean>;
	isEnrolled: boolean;
	isAdmin?: boolean;
	totalLessons: number;
	doneLessons: number;
	watchedSeconds: number;
	hlsUrl: string | null;
}

export function LearnPageClient({
	courseSlug,
	courseTitle,
	lessonId,
	lessonTitle,
	moduleTitle,
	lessonBodyMd,
	// Kept on the props interface so server callers don't need to be edited
	// when we re-introduce the player fallback / sidebar prev-link.
	bunnyVideoId: _bunnyVideoId,
	durationSeconds,
	nextLessonId,
	prevLessonId: _prevLessonId,
	quizId,
	modules,
	progress,
	passedQuizIds,
	isEnrolled,
	isAdmin = false,
	totalLessons,
	doneLessons,
	watchedSeconds,
	hlsUrl,
}: LearnPageClientProps) {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"content" | "notes">("content");

	// Autoplay-next countdown state
	const [showCountdown, setShowCountdown] = useState(false);
	const [countdownValue, setCountdownValue] = useState(10);
	const countdownCancelledRef = useRef(false);
	const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const passedQuizMap = useMemo(
		() =>
			passedQuizIds
				? new Map(Object.entries(passedQuizIds))
				: new Map<string, boolean>(),
		[passedQuizIds],
	);

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

	return (
		<div className="flex h-[100dvh] flex-col bg-(--background)">
			<LearnTopbar
				courseTitle={courseTitle}
				moduleTitle={moduleTitle}
				lessonTitle={lessonTitle}
				totalLessons={totalLessons}
				doneLessons={doneLessons}
				onToggleSidebar={() => {
					if (window.innerWidth < 1024) {
						setMobileDrawerOpen((v) => !v);
					} else {
						setSidebarOpen((v) => !v);
					}
				}}
				sidebarOpen={sidebarOpen}
			/>

			<div className="flex flex-1 min-h-0">
				{/* Main content */}
				<main className="flex-1 overflow-y-auto min-w-0">
					{/* Player — only render the 16:9 container when there's actually
              a video. Otherwise emit a slim banner so lesson body fills the
              viewport instead of being pushed below the fold by an empty
              video well. */}
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
							{quizId && (
								<Link
									href={`/learn/${courseSlug}/quiz/${quizId}`}
									className="px-0 py-3 text-ui font-medium text-(--foreground-muted) hover:text-(--foreground)"
								>
									แบบทดสอบ
								</Link>
							)}
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

				{/* Curriculum sidebar (desktop) */}
				{sidebarOpen && (
					<aside className="hidden lg:block w-[320px] shrink-0 border-l border-(--border) overflow-hidden">
						<CurriculumSidebar
							courseSlug={courseSlug}
							modules={modules}
							progress={progress}
							passedQuizIds={passedQuizMap}
							isEnrolled={isEnrolled}
							isAdmin={isAdmin}
							totalLessons={totalLessons}
						/>
					</aside>
				)}
			</div>

			{/* Mobile drawer */}
			<MobileCurriculumDrawer
				open={mobileDrawerOpen}
				onClose={() => setMobileDrawerOpen(false)}
				courseSlug={courseSlug}
				modules={modules}
				progress={progress}
				passedQuizIds={passedQuizMap}
				isEnrolled={isEnrolled}
				isAdmin={isAdmin}
			/>

			{/* Course-complete celebration: fires once per course (localStorage),
          positioned as a centred modal — not on top of the video. Hidden
          for admin previews; admins never enroll. */}
			{!isAdmin && (
				<CourseCompleteModal
					courseSlug={courseSlug}
					totalLessons={totalLessons}
					doneLessons={doneLessons}
				/>
			)}
		</div>
	);
}

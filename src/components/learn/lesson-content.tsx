"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { VidstackPlayer } from "@/components/course/vidstack-player";
import { LearnTopbar } from "./learn-topbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "@phosphor-icons/react";
import { useLearnShell } from "./learn-shell-context";
import { LessonPlayerLayout } from "./lesson-player-layout";
import { useAutoplayCountdown } from "@/hooks/use-autoplay-countdown";
import { useLessonCompletionEvent } from "@/hooks/use-lesson-completion-event";

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
	isCompleted?: boolean;
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
	isCompleted = false,
}: LessonContentProps) {
	const router = useRouter();
	const { sidebarOpen, toggleSidebar, toggleMobileDrawer } = useLearnShell();

	const { showCountdown, countdownValue, startCountdown, cancelCountdown } =
		useAutoplayCountdown({
			onNavigate: () => router.push(`/learn/${courseSlug}/${nextLessonId}`),
		});

	useLessonCompletionEvent({
		lessonId,
		onCompleted: () => router.refresh(),
	});

	const handleVideoEnded = useCallback(() => {
		if (quizId || !nextLessonId) return;
		startCountdown();
	}, [quizId, nextLessonId, startCountdown]);

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
				<LessonPlayerLayout
					lessonId={lessonId}
					lessonTitle={lessonTitle}
					moduleTitle={moduleTitle}
					lessonBodyMd={lessonBodyMd}
					durationSeconds={durationSeconds}
					totalLessons={totalLessons}
					doneLessons={doneLessons}
					courseSlug={courseSlug}
					nextLessonId={nextLessonId}
					quizId={quizId}
					prevLessonId={_prevLessonId}
					isAdmin={isAdmin}
					isCompleted={isCompleted}
					playerSlot={
						hlsUrl ? (
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
											<Button
												variant="ghost"
												size="md"
												onClick={cancelCountdown}
											>
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
						)
					}
				/>
			</main>
		</>
	);
}

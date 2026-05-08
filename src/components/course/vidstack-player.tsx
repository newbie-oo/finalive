"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
	DefaultVideoLayout,
	defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import type { MediaTimeUpdateEventDetail } from "@vidstack/react";
import {
	CheckCircle,
	ArrowRight,
	Exam,
	Repeat,
	WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useLessonProgress } from "@/hooks/use-lesson-progress";

export interface VidstackPlayerProps {
	src: string;
	title?: string;
	poster?: string;
	currentTime?: number;
	lessonId?: string;
	nextLessonId?: string | null;
	/** When the just-watched lesson has a quiz, prefer the quiz CTA in the
	 * completion overlay over "next lesson" so students don't accidentally
	 * skip the assessment. */
	quizId?: string | null;
	courseSlug?: string;
	/** When true, suppress all progress writes — admin previews must not
	 * accrue completion records that would later trigger the certificate
	 * banner. */
	suppressProgress?: boolean;
	/** Called when the video reaches the end. Parent can use this to trigger
	 * autoplay-next countdown or other post-video actions. */
	onVideoEnded?: () => void;
}

export function VidstackPlayer({
	src,
	title,
	poster,
	currentTime = 0,
	lessonId,
	nextLessonId,
	quizId,
	courseSlug,
	suppressProgress = false,
	onVideoEnded,
}: VidstackPlayerProps) {
	const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
	const [hasFatalError, setHasFatalError] = useState(false);

	const { saveProgress, markComplete, isCompleted, resetComplete } =
		useLessonProgress({ lessonId, suppressProgress });

	const handleError = useCallback(() => {
		// Vidstack/HLS fatal errors (e.g. signed URL 404 because the upstream
		// Bunny asset was deleted) used to bubble up as an uncaught exception
		// and leave the player in a broken state. Swap to a quiet fallback
		// panel instead.
		setHasFatalError(true);
	}, []);

	const handleTimeUpdate = useCallback(
		(detail: MediaTimeUpdateEventDetail) => {
			saveProgress(detail.currentTime);
		},
		[saveProgress],
	);

	const handleEnded = useCallback(() => {
		if (isCompleted) return;
		setShowCompleteOverlay(true);
		onVideoEnded?.();
		markComplete();
	}, [isCompleted, onVideoEnded, markComplete]);

	const handleReplay = useCallback(() => {
		resetComplete();
		setShowCompleteOverlay(false);
	}, [resetComplete]);

	if (hasFatalError) {
		return (
			<div className="flex w-full flex-col items-center justify-center gap-3 rounded-sm border border-border bg-muted px-6 py-12 text-center">
				<WarningCircle
					size={40}
					weight="duotone"
					className="text-muted-foreground"
				/>
				<h3 className="text-h3 text-foreground">วิดีโอนี้ยังไม่พร้อมใช้งาน</h3>
				<p className="max-w-md text-body text-muted-foreground">
					เราไม่สามารถโหลดวิดีโอนี้ได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง หรือแจ้งทีมงานที่{" "}
					<a
						href="mailto:hello@finalive.dev"
						className="text-primary hover:underline"
					>
						hello@finalive.dev
					</a>{" "}
					เราจะเร่งแก้ไขให้เร็วที่สุด
				</p>
			</div>
		);
	}

	return (
		<div className="relative w-full" data-testid="video-player">
			<MediaPlayer
				src={src}
				viewType="video"
				streamType="on-demand"
				title={title}
				poster={poster}
				playsInline
				aspectRatio="16/9"
				currentTime={currentTime}
				className="w-full overflow-hidden rounded-sm border border-border bg-black"
				keyShortcuts={{
					togglePaused: "k Space",
					toggleMuted: "m",
					toggleFullscreen: "f",
					togglePictureInPicture: "i",
					toggleCaptions: "c",
					seekBackward: "j ArrowLeft",
					seekForward: "l ArrowRight",
					volumeUp: "ArrowUp",
					volumeDown: "ArrowDown",
				}}
				onTimeUpdate={handleTimeUpdate}
				onEnded={handleEnded}
				onError={handleError}
			>
				<MediaProvider />
				<DefaultVideoLayout icons={defaultLayoutIcons} />
			</MediaPlayer>

			{showCompleteOverlay && (
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-sm bg-black/80 backdrop-blur-sm">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-success">
						<CheckCircle size={32} weight="fill" className="text-white" />
					</div>
					<h3 className="mt-4 text-h3 text-white">จบบทเรียนแล้ว!</h3>
					<p className="mt-1 text-body text-white/70">ยินดีด้วย คุณเรียนจบบทนี้แล้ว</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						{/* Quiz takes precedence over "next lesson" so students complete
                the assessment before moving on. */}
						{quizId && courseSlug ? (
							<Link
								href={`/learn/${courseSlug}/quiz/${quizId}`}
								className="inline-flex h-11 items-center gap-2 rounded-button bg-accent px-5 text-ui font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
							>
								<Exam size={16} weight="bold" /> ทำแบบทดสอบ
							</Link>
						) : nextLessonId && courseSlug ? (
							<Link
								href={`/learn/${courseSlug}/${nextLessonId}`}
								className="inline-flex h-11 items-center gap-2 rounded-button bg-accent px-5 text-ui font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
							>
								บทถัดไป <ArrowRight size={16} weight="bold" />
							</Link>
						) : null}
						{/* Show next-lesson as a secondary action when a quiz exists, so
                students who already passed can still skip ahead. */}
						{quizId && nextLessonId && courseSlug && (
							<Link
								href={`/learn/${courseSlug}/${nextLessonId}`}
								className="inline-flex h-11 items-center gap-2 rounded-button border border-white/25 bg-white/10 px-5 text-ui font-medium text-white transition-colors hover:bg-white/20"
							>
								บทถัดไป <ArrowRight size={16} weight="bold" />
							</Link>
						)}
						<button
							type="button"
							onClick={handleReplay}
							className="inline-flex h-11 items-center gap-2 rounded-button border border-white/25 bg-white/10 px-5 text-ui font-medium text-white transition-colors hover:bg-white/20"
						>
							<Repeat size={16} weight="bold" /> ดูอีกครั้ง
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

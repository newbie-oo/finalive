"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import type { MediaTimeUpdateEventDetail } from "@vidstack/react";
import { CheckCircle, ArrowRight, Repeat } from "@phosphor-icons/react";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

export interface VidstackPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  currentTime?: number;
  lessonId?: string;
  nextLessonId?: string | null;
  courseSlug?: string;
}

export function VidstackPlayer({
  src,
  title,
  poster,
  currentTime = 0,
  lessonId,
  nextLessonId,
  courseSlug,
}: VidstackPlayerProps) {
  const lastSaveRef = useRef(0);
  const hasEndedRef = useRef(false);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);

  const saveProgress = useCallback(
    (seconds: number) => {
      if (!lessonId) return;
      fetch("/api/learn/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, watchedSeconds: Math.floor(seconds) }),
      }).catch(() => {});
    },
    [lessonId],
  );

  const handleTimeUpdate = useCallback(
    (detail: MediaTimeUpdateEventDetail) => {
      const now = Date.now();
      // Throttle: save every 10 seconds
      if (now - lastSaveRef.current < 10_000) return;
      lastSaveRef.current = now;
      saveProgress(detail.currentTime);
    },
    [saveProgress],
  );

  const handleEnded = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setShowCompleteOverlay(true);
    // Save final progress and auto-mark complete
    if (lessonId) {
      fetch("/api/learn/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, watchedSeconds: 999_999 }),
      })
        .then(() => {
          // Dispatch a custom event so the parent page can refresh
          window.dispatchEvent(new CustomEvent("lesson-completed", { detail: { lessonId } }));
        })
        .catch(() => {});
    }
  }, [lessonId]);

  const handleReplay = useCallback(() => {
    hasEndedRef.current = false;
    setShowCompleteOverlay(false);
  }, []);

  return (
    <div className="relative w-full">
      <MediaPlayer
        src={src}
        viewType="video"
        streamType="on-demand"
        title={title}
        poster={poster}
        playsInline
        aspectRatio="16/9"
        currentTime={currentTime}
        className="w-full overflow-hidden rounded border border-border bg-black"
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
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* Completion overlay */}
      {showCompleteOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded bg-black/80 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--success)">
            <CheckCircle size={32} weight="fill" className="text-white" />
          </div>
          <h3 className="mt-4 text-h3 text-white">จบบทเรียนแล้ว!</h3>
          <p className="mt-1 text-body text-white/70">ยินดีด้วย คุณเรียนจบบทนี้แล้ว</p>
          <div className="mt-6 flex gap-3">
            {nextLessonId && courseSlug && (
              <Link
                href={`/learn/${courseSlug}/${nextLessonId}`}
                className="inline-flex h-11 items-center gap-2 rounded-button bg-(--accent) px-5 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
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

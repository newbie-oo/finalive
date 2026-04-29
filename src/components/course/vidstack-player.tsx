"use client";

import { useRef, useCallback } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import type { MediaTimeUpdateEventDetail } from "@vidstack/react";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

export interface VidstackPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  currentTime?: number;
  lessonId?: string;
}

export function VidstackPlayer({
  src,
  title,
  poster,
  currentTime = 0,
  lessonId,
}: VidstackPlayerProps) {
  const lastSaveRef = useRef(0);
  const hasEndedRef = useRef(false);
  const playerRef = useRef<HTMLMediaElement | null>(null);

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
    // Save final progress and auto-mark complete
    if (lessonId) {
      fetch("/api/learn/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, watchedSeconds: 999_999 }),
      }).catch(() => {});
    }
  }, [lessonId]);

  return (
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
  );
}

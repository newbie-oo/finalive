"use client";

import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

export interface VidstackPlayerProps {
  src: string;
  title?: string;
  poster?: string;
}

export function VidstackPlayer({ src, title, poster }: VidstackPlayerProps) {
  return (
    <MediaPlayer
      src={src}
      viewType="video"
      streamType="on-demand"
      title={title}
      poster={poster}
      playsInline
      aspectRatio="16/9"
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
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}

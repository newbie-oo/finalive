import { buildEmbedUrl } from "@/server/services/bunny";

export interface BunnyPlayerProps {
  videoId: string;
  title?: string;
}

export function BunnyPlayer({ videoId, title }: BunnyPlayerProps) {
  const src = buildEmbedUrl({ videoId });
  return (
    <div className="aspect-video w-full overflow-hidden rounded border border-border bg-black">
      <iframe
        src={src}
        title={title ?? "Lesson video"}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

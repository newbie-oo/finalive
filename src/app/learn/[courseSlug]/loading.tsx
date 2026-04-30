// Skeleton shown while the server resolves /learn/{slug} → first lesson.
// Without this Next.js streamed an empty <body> for ~5s during HMR /
// cold cache, which looked broken to first-time enrollees.
export default function LearnRouteLoading() {
  return (
    <div className="flex h-dvh flex-col bg-(--background)">
      {/* Topbar shimmer */}
      <div className="flex h-14 items-center gap-3 border-b border-(--border) bg-(--surface) px-4 lg:px-6">
        <div className="h-6 w-6 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="h-4 w-40 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="ml-auto h-4 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
      </div>
      {/* Body shimmer: video placeholder + a few content blocks */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-black/5 lg:p-4">
          <div className="aspect-video w-full animate-pulse bg-(--surface-muted)" />
        </div>
        <div className="mx-auto max-w-[720px] space-y-4 px-4 py-8 lg:px-8">
          <div className="h-7 w-2/3 animate-pulse rounded-md bg-(--surface-muted)" />
          <div className="h-4 w-full animate-pulse rounded-md bg-(--surface-muted)" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-(--surface-muted)" />
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-(--surface-muted)" />
        </div>
      </div>
    </div>
  );
}

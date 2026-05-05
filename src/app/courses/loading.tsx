export default function CoursesLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      {/* Page header shimmer */}
      <div className="mb-8">
        <div className="mb-4 h-10 w-64 animate-pulse rounded-lg bg-(--surface-muted)" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-(--surface-muted)" />
      </div>

      {/* Filter bar shimmer */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="h-10 w-32 animate-pulse rounded-[10px] bg-(--surface-muted)" />
        <div className="h-10 w-32 animate-pulse rounded-[10px] bg-(--surface-muted)" />
        <div className="h-10 w-40 animate-pulse rounded-[10px] bg-(--surface-muted)" />
        <div className="ml-auto h-10 w-24 animate-pulse rounded-[10px] bg-(--surface-muted)" />
      </div>

      {/* Course cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-card border border-(--border) bg-(--surface)"
          >
            <div className="aspect-video w-full animate-pulse bg-(--surface-muted)" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded-md bg-(--surface-muted)" />
              <div className="h-4 w-full animate-pulse rounded-md bg-(--surface-muted)" />
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-(--surface-muted)" />
              <div className="mt-2 flex items-center justify-between">
                <div className="h-5 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

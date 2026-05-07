export default function CourseDetailLoading() {
  return (
    <div>
      <div className="bg-(--surface-sunken)">
        <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
            <div className="h-4 w-4 animate-pulse rounded-md bg-(--surface-muted)" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="h-6 w-28 animate-pulse rounded-full bg-(--surface-muted)" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-(--surface-muted)" />
              </div>
              <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-(--surface-muted)" />
              <div className="space-y-2">
                <div className="h-5 w-full animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-5 w-4/5 animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-(--surface-muted)" />
                <div>
                  <div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
                  <div className="mt-1 h-3 w-40 animate-pulse rounded-md bg-(--surface-muted)" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-16 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-28 animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
            </div>

            <div className="rounded-card border border-(--border) bg-(--surface) p-6 shadow-(--shadow-md)">
              <div className="mb-4 aspect-video w-full animate-pulse rounded-lg bg-(--surface-muted)" />
              <div className="mb-5 h-8 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
              <div className="mb-6 space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="h-4 w-4 animate-pulse rounded-sm bg-(--surface-muted)" />
                    <div className="h-4 w-48 animate-pulse rounded-md bg-(--surface-muted)" />
                  </div>
                ))}
              </div>
              <div className="h-12 w-full animate-pulse rounded-[10px] bg-(--surface-muted)" />
            </div>
          </div>
        </div>
      </div>

      <div className="py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-6 flex gap-6 border-b border-(--border)">
            <div className="h-10 w-12 animate-pulse rounded-md bg-(--surface-muted)" />
            <div className="h-10 w-14 animate-pulse rounded-md bg-(--surface-muted)" />
            <div className="h-10 w-10 animate-pulse rounded-md bg-(--surface-muted)" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-card border border-(--border) bg-(--surface) p-4"
              >
                <div className="mt-0.5 h-5 w-5 animate-pulse rounded-sm bg-(--surface-muted)" />
                <div className="h-5 w-full animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

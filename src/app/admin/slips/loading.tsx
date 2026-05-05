export default function AdminSlipsLoading() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-(--surface-muted)" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-(--surface-muted)" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-md border border-(--border) bg-(--surface-muted)"
            />
          ))}
        </div>
      </div>

      {/* Slip queue cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-(--border) bg-(--surface) p-5"
          >
            <div className="flex items-start gap-4">
              <div className="h-24 w-32 shrink-0 animate-pulse rounded-md bg-(--surface-muted)" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-5 w-48 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
              <div className="flex shrink-0 gap-2">
                <div className="h-9 w-20 animate-pulse rounded-button bg-(--surface-muted)" />
                <div className="h-9 w-20 animate-pulse rounded-button bg-(--surface-muted)" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 h-8 w-48 animate-pulse rounded-lg bg-(--surface-muted)" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-(--surface-muted)" />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-(--border)">
        <div className="h-10 w-20 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="h-10 w-28 animate-pulse rounded-md bg-(--surface-muted)" />
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-(--border) bg-(--surface) p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-32 animate-pulse rounded-md bg-(--surface-muted)" />
                <div className="h-4 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
              </div>
              <div className="h-8 w-24 animate-pulse rounded-[10px] bg-(--surface-muted)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

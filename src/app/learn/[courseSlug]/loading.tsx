export default function LearnLessonLoading() {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-nav bg-muted" />
        <div className="min-w-0 flex-1 lg:flex-none">
          <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-1 hidden h-3 w-32 animate-pulse rounded-md bg-muted lg:block" />
        </div>
        <div className="hidden max-w-[480px] flex-1 items-center gap-4 lg:flex">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/30" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden h-8 w-8 animate-pulse rounded-nav bg-muted lg:block" />
          <div className="h-8 w-8 animate-pulse rounded-nav bg-muted" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/30" />
          </div>
          <div className="h-4 w-10 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="relative bg-black flex justify-center lg:p-4">
          <div className="aspect-video w-full animate-pulse bg-muted/60" />
        </div>

        <div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[720px] mx-auto">
          <div className="flex gap-6 border-b border-border mb-6">
            <div className="h-10 w-12 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
          </div>

          <div className="mb-2 h-8 w-2/3 animate-pulse rounded-md bg-muted" />

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-1 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          </div>

          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </main>
    </>
  );
}

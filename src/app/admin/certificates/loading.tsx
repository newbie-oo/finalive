export default function AdminCertificatesLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-border bg-muted px-5 py-3">
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto h-4 w-20 animate-pulse rounded-md bg-muted" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
          >
            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-[480px] px-6 py-12">
      <div className="rounded-card border border-border bg-card p-6 shadow-(--shadow-sm)">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-6 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mx-auto h-4 w-32 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mb-6 rounded-button border border-border bg-muted p-4">
          <div className="h-5 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
        </div>

        <div className="mb-6">
          <div className="mb-2 h-4 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-button bg-muted" />
        </div>

        <div className="h-12 w-full animate-pulse rounded-button bg-muted" />
      </div>
    </div>
  );
}

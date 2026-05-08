import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-muted/40 px-6 py-12 text-center"
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-h4 text-foreground">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-body text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

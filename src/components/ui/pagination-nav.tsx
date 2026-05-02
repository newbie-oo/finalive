import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PaginationNavProps {
  page: number;
  totalPages: number;
  basePath: string; // e.g., "/courses"
  perPage?: number;
}

function pageUrl(basePath: string, page: number, perPage?: number): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (perPage) params.set("per_page", String(perPage));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("ellipsis");
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

export function PaginationNav({ page, totalPages, basePath, perPage }: PaginationNavProps) {
  if (totalPages <= 1) return null;
  const items = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-1 text-sm"
    >
      {page > 1 ? (
        <Link
          href={pageUrl(basePath, page - 1, perPage)}
          className="rounded border border-border px-3 py-1.5 hover:bg-muted"
        >
          ก่อนหน้า
        </Link>
      ) : null}

      {items.map((it, idx) =>
        it === "ellipsis" ? (
          <span key={`e-${idx}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={pageUrl(basePath, it, perPage)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "rounded border px-3 py-1.5",
              it === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {it}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={pageUrl(basePath, page + 1, perPage)}
          className="rounded border border-border px-3 py-1.5 hover:bg-muted"
        >
          ถัดไป
        </Link>
      ) : null}
    </nav>
  );
}

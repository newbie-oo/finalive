import Link from "next/link";
import { cn } from "@/lib/utils";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

export interface PaginationNavProps {
  page: number;
  totalPages: number;
  basePath: string; // e.g., "/courses"
  perPage?: number;
  /** Existing query string to preserve (without leading `?`). */
  searchParams?: string;
}

function pageUrl(
  basePath: string,
  page: number,
  perPage?: number,
  searchParams?: string,
): string {
  const params = new URLSearchParams(searchParams || "");
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  if (perPage) params.set("per_page", String(perPage));
  else params.delete("per_page");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageNumbers(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
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

export function PaginationNav({
  page,
  totalPages,
  basePath,
  perPage,
  searchParams,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;
  const items = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-2 text-sm"
    >
      {page > 1 ? (
        <Link
          href={pageUrl(basePath, page - 1, perPage, searchParams)}
          className="inline-flex h-9 items-center gap-1 rounded-button border border-(--border) bg-(--surface) px-3 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
        >
          <CaretLeft size={14} />
          ก่อนหน้า
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center gap-1 rounded-button border border-(--border) bg-(--surface-muted) px-3 text-ui text-(--foreground-subtle)">
          <CaretLeft size={14} />
          ก่อนหน้า
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {items.map((it, idx) =>
          it === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="flex h-9 w-9 items-center justify-center text-(--foreground-subtle)"
            >
              …
            </span>
          ) : (
            <Link
              key={it}
              href={pageUrl(basePath, it, perPage, searchParams)}
              aria-current={it === page ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-button text-ui font-medium transition-colors",
                it === page
                  ? "bg-(--primary) text-white"
                  : "text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)",
              )}
            >
              {it}
            </Link>
          ),
        )}
      </div>

      {page < totalPages ? (
        <Link
          href={pageUrl(basePath, page + 1, perPage, searchParams)}
          className="inline-flex h-9 items-center gap-1 rounded-button border border-(--border) bg-(--surface) px-3 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
        >
          ถัดไป
          <CaretRight size={14} />
        </Link>
      ) : (
        <span className="inline-flex h-9 items-center gap-1 rounded-button border border-(--border) bg-(--surface-muted) px-3 text-ui text-(--foreground-subtle)">
          ถัดไป
          <CaretRight size={14} />
        </span>
      )}
    </nav>
  );
}

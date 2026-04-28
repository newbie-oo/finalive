"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { formatTHB } from "@/lib/format";
import type { SlipQueueStatus } from "@/server/repos/slip";

interface SlipRow {
  id: string;
  status: string;
  expectedAmount: string;
  reportedAmount: string | null;
  createdAt: string;
  pendingId: string;
  refCode: string;
  studentUserId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

interface PageResponse {
  data: SlipRow[];
  pagination: { next_cursor: string | null; per_page: number; has_next: boolean };
}

async function fetchPage({
  pageParam,
  status,
}: {
  pageParam: string | undefined;
  status: SlipQueueStatus;
}): Promise<PageResponse> {
  const params = new URLSearchParams({ status, per_page: "50" });
  if (pageParam) params.set("cursor", pageParam);
  const res = await fetch(`/api/admin/slips?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PageResponse;
}

export function SlipList({
  status,
  selectedId,
  initialFirstId,
}: {
  status: SlipQueueStatus;
  selectedId: string | undefined;
  initialFirstId: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const query = useInfiniteQuery({
    queryKey: ["admin-slips", status],
    queryFn: ({ pageParam }) => fetchPage({ pageParam, status }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination.next_cursor ?? undefined,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const rows = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );
  const activeId = selectedId ?? initialFirstId ?? rows[0]?.id;

  // When the queue refreshes and the previously selected slip leaves the
  // current status filter, drop the stale ?selected= so the URL reflects
  // what's actually visible.
  useEffect(() => {
    if (!selectedId) return;
    if (rows.length > 0 && !rows.some((r) => r.id === selectedId)) {
      const next = new URLSearchParams(sp.toString());
      next.delete("selected");
      router.replace(`/admin/slips?${next.toString()}`);
    }
  }, [rows, selectedId, router, sp]);

  if (query.isLoading && rows.length === 0) {
    return (
      <ul className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        กำลังโหลด…
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <ul className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        — ไม่มี slip ในคิวนี้ —
      </ul>
    );
  }

  return (
    <div className="flex max-h-[70vh] flex-col rounded-md border border-border">
      <ul className="flex flex-col overflow-y-auto">
        {rows.map((slip) => {
          const active = slip.id === activeId;
          return (
            <li key={slip.id}>
              <Link
                href={`/admin/slips?status=${status}&selected=${slip.id}`}
                className={`flex flex-col gap-0.5 border-b border-border px-3 py-2 text-sm last:border-b-0 ${
                  active ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">{slip.refCode}</span>
                <span className="text-xs text-muted-foreground">{slip.courseTitle}</span>
                <span className="text-xs">{formatTHB(slip.expectedAmount)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="border-t border-border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
        >
          {query.isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
        </button>
      ) : null}
    </div>
  );
}

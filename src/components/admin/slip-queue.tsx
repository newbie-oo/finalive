"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatTHB } from "@/lib/format";
import type { SlipQueueStatus } from "@/server/repos/slip";
import { SlipImageViewer } from "./slip-image-viewer";
import { REJECT_REASONS, REJECT_REASON_LABEL } from "./slip-reject-options";

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

interface SlipQueueProps {
  status: SlipQueueStatus;
  initialSelectedId: string | undefined;
}

export function SlipQueue({ status, initialSelectedId }: SlipQueueProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();

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

  const activeId = initialSelectedId ?? rows[0]?.id;
  const active = rows.find((r) => r.id === activeId) ?? null;
  const activeIndex = active ? rows.findIndex((r) => r.id === active.id) : -1;

  // When the polled queue drops the selected slip, clear ?selected=.
  useEffect(() => {
    if (!initialSelectedId) return;
    if (rows.length > 0 && !rows.some((r) => r.id === initialSelectedId)) {
      const next = new URLSearchParams(sp.toString());
      next.delete("selected");
      router.replace(`/admin/slips?${next.toString()}`);
    }
  }, [rows, initialSelectedId, router, sp]);

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(sp.toString());
      next.set("status", status);
      next.set("selected", id);
      router.replace(`/admin/slips?${next.toString()}`, { scroll: false });
    },
    [router, sp, status],
  );

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      if (rows.length === 0) return;
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const target = Math.min(rows.length - 1, Math.max(0, idx + delta));
      const row = rows[target];
      if (row) select(row.id);
    },
    [rows, activeIndex, select],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const rejectButtonRef = useRef<HTMLButtonElement | null>(null);
  const [bulkMode, setBulkMode] = useState<"none" | "reject">("none");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Drop selections that left the visible queue (filter change / accepted /
  // rejected) at read time so we never act on phantom IDs.
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const effectiveSelected = useMemo(
    () => new Set(Array.from(selected).filter((id) => visibleIds.has(id))),
    [selected, visibleIds],
  );

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["admin-slips"] });
    router.refresh();
  }, [qc, router]);

  const accept = useCallback(async () => {
    if (!active || busy) return;
    if (active.status !== "submitted") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/slips/${active.id}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? `accept failed (${res.status})`);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [active, busy, refresh]);

  const bulkAccept = useCallback(async () => {
    if (effectiveSelected.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/slips/bulk-accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slipIds: Array.from(effectiveSelected) }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        succeeded?: string[];
        failed?: Array<{ slipId: string; message: string }>;
        message?: string;
      };
      if (!res.ok) {
        setError(body.message ?? `bulk accept failed (${res.status})`);
        return;
      }
      if (body.failed && body.failed.length > 0) {
        setError(`สำเร็จ ${body.succeeded?.length ?? 0} · ล้มเหลว ${body.failed.length}`);
      }
      setSelected(new Set());
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [effectiveSelected, busy, refresh]);

  const bulkReject = useCallback(
    async (reason: (typeof REJECT_REASONS)[number]) => {
      if (effectiveSelected.size === 0 || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/slips/bulk-reject", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slipIds: Array.from(effectiveSelected), reason }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          succeeded?: string[];
          failed?: Array<{ slipId: string; message: string }>;
          message?: string;
        };
        if (!res.ok) {
          setError(body.message ?? `bulk reject failed (${res.status})`);
          return;
        }
        if (body.failed && body.failed.length > 0) {
          setError(`สำเร็จ ${body.succeeded?.length ?? 0} · ล้มเหลว ${body.failed.length}`);
        }
        setSelected(new Set());
        setBulkMode("none");
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [effectiveSelected, busy, refresh],
  );

  const reject = useCallback(
    async (reason: (typeof REJECT_REASONS)[number], note?: string) => {
      if (!active || busy) return;
      if (active.status !== "submitted") return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/slips/${active.id}/reject`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason, note }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          setError(body.message ?? `reject failed (${res.status})`);
          return;
        }
        setRejectOpen(false);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [active, busy, refresh],
  );

  // Hotkeys: j/k navigate, Enter no-op (already focused), a accept, r open reject.
  // Skip when typing in inputs or when the reject popover holds focus.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === "a") {
        e.preventDefault();
        void accept();
      } else if (e.key === "r") {
        e.preventDefault();
        setRejectOpen(true);
        // Let React commit the dialog before focusing.
        queueMicrotask(() => rejectButtonRef.current?.focus());
      } else if (e.key === " ") {
        // Space toggles selection on the currently active row.
        if (active) {
          e.preventDefault();
          toggleSelected(active.id);
        }
      } else if (e.key === "Escape") {
        if (rejectOpen) {
          e.preventDefault();
          setRejectOpen(false);
        } else if (bulkMode !== "none") {
          e.preventDefault();
          setBulkMode("none");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveSelection, accept, rejectOpen, active, toggleSelected, bulkMode]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex max-h-[70vh] flex-col rounded-md border border-border">
        {effectiveSelected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm">
            <span>เลือก {effectiveSelected.size}</span>
            <button
              type="button"
              onClick={bulkAccept}
              disabled={busy}
              className="rounded-md bg-foreground px-2 py-1 text-xs text-background disabled:opacity-50"
            >
              อนุมัติทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setBulkMode((v) => (v === "reject" ? "none" : "reject"))}
              disabled={busy}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              ปฏิเสธทั้งหมด…
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                setBulkMode("none");
              }}
              className="ml-auto text-xs text-muted-foreground hover:underline"
            >
              ล้างการเลือก
            </button>
            {bulkMode === "reject" ? (
              <div className="flex w-full flex-wrap gap-2 border-t border-border pt-2">
                {REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => bulkReject(r)}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {REJECT_REASON_LABEL[r]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <ul className="flex flex-col overflow-y-auto">
          {query.isLoading && rows.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">กำลังโหลด…</li>
          ) : rows.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">— ไม่มีสลิปในคิวนี้ —</li>
          ) : (
            rows.map((slip) => {
              const isActive = slip.id === activeId;
              const isChecked = effectiveSelected.has(slip.id);
              return (
                <li
                  key={slip.id}
                  className={`flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0 ${
                    isActive ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelected(slip.id)}
                    aria-label={`เลือก ${slip.refCode}`}
                    className="size-4"
                  />
                  <Link
                    href={`/admin/slips?status=${status}&selected=${slip.id}`}
                    scroll={false}
                    className="flex flex-1 flex-col gap-0.5"
                  >
                    <span className="font-medium">{slip.refCode}</span>
                    <span className="text-xs text-muted-foreground">{slip.courseTitle}</span>
                    <span className="text-xs">{formatTHB(slip.expectedAmount)}</span>
                  </Link>
                </li>
              );
            })
          )}
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

      <div className="rounded-md border border-border p-4">
        {active ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{active.refCode}</h2>
              <span className="text-xs text-muted-foreground">
                ปุ่มลัด: <kbd>j</kbd>/<kbd>k</kbd> เลื่อน · <kbd>Space</kbd> เลือก · <kbd>a</kbd> อนุมัติ · <kbd>r</kbd> ปฏิเสธ
              </span>
            </div>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">คอร์ส</dt>
              <dd>{active.courseTitle}</dd>
              <dt className="text-muted-foreground">ราคา</dt>
              <dd>{formatTHB(active.expectedAmount)}</dd>
              <dt className="text-muted-foreground">นักเรียนแจ้งยอด</dt>
              <dd>
                {active.reportedAmount ? formatTHB(active.reportedAmount) : "—"}
              </dd>
              <dt className="text-muted-foreground">นักเรียน</dt>
              <dd className="font-mono text-xs">{active.studentUserId}</dd>
              <dt className="text-muted-foreground">ส่งเมื่อ</dt>
              <dd>{new Date(active.createdAt).toLocaleString("th-TH")}</dd>
              <dt className="text-muted-foreground">สถานะ</dt>
              <dd>{active.status}</dd>
            </dl>

            <SlipImageViewer slipId={active.id} />

            {error ? (
              <div className="rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {active.status === "submitted" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={accept}
                  disabled={busy}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
                >
                  อนุมัติ (a)
                </button>
                <button
                  type="button"
                  ref={rejectButtonRef}
                  onClick={() => setRejectOpen((v) => !v)}
                  disabled={busy}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  ปฏิเสธ (r)
                </button>
                {rejectOpen ? (
                  <div className="w-full rounded-md border border-border p-3">
                    <p className="mb-2 text-sm font-medium">เลือกเหตุผล</p>
                    <div className="flex flex-wrap gap-2">
                      {REJECT_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={busy}
                          onClick={() => reject(r)}
                          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted disabled:opacity-50"
                        >
                          {REJECT_REASON_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                slip นี้ผ่านการตรวจแล้ว ({active.status})
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">เลือกสลิปทางซ้ายเพื่อดูรายละเอียด</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  X,
  CaretUp,
  CaretDown,
  Eye,
  Clock,
  CheckCircle,
  Prohibit,
  Coins,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";

interface SlipRow {
  id: string;
  status: string;
  expectedAmount: string;
  reportedAmount: string | null;
  rejectionReason: string | null;
  rejectionNote: string | null;
  createdAt: string;
  pendingId: string;
  refCode: string;
  studentUserId: string;
  studentName: string | null;
  studentEmail: string | null;
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

  // Only open the detail panel when the URL says so (?selected=...). The
  // previous code auto-selected rows[0] on the submitted tab, which made
  // the panel look stuck open on every fresh load and prevented closing
  // by clicking elsewhere.
  const activeId = initialSelectedId;
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

  // Bulk accept/reject UIs are wired in the API + state but the trigger
  // controls were removed from the layout pending a follow-up redesign.
  // Keep the callbacks behind underscore-prefixed names so the eslint
  // unused-vars rule passes without losing the implementation.
  const _bulkAccept = useCallback(async () => {
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

  const _bulkReject = useCallback(
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

  // Hotkeys
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
        queueMicrotask(() => rejectButtonRef.current?.focus());
      } else if (e.key === "s") {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === " ") {
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
        } else if (activeId) {
          const next = new URLSearchParams(sp.toString());
          next.delete("selected");
          router.replace(`/admin/slips?${next.toString()}`, { scroll: false });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveSelection, accept, rejectOpen, active, toggleSelected, bulkMode, activeId, sp, router]);

  const clearSelection = useCallback(() => {
    const next = new URLSearchParams(sp.toString());
    next.delete("selected");
    router.replace(
      `/admin/slips${next.toString() ? `?${next.toString()}` : ""}`,
      { scroll: false },
    );
  }, [router, sp]);

  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start"
      style={{ minHeight: "calc(100vh - 3.5rem - 3rem)" }}
    >
      {/* Table — overflow-x-auto so we never collapse columns to 1-char
          widths on the narrow split-pane left column. The sticky split-pane
          shrinks the table area noticeably; without min-width the fixed
          layout was squishing student name + course title to "Q..." / "D...". */}
      <div className="rounded-[14px] border border-(--border) bg-(--surface) overflow-x-auto min-w-0">
        <table className="w-full border-collapse min-w-[520px]" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b border-(--border) bg-(--surface-muted)">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)" style={{ width: 140 }}>
                รหัส
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
                style={{ minWidth: 150 }}
              >
                ผู้เรียน
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
                style={{ minWidth: 140 }}
              >
                คอร์ส
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)" style={{ width: 110 }}>
                จำนวน
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)" style={{ width: 100 }}>
                เวลา
              </th>
              <th className="px-3 py-2.5" style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {query.isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-caption text-(--foreground-muted)">กำลังโหลด…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-caption text-(--foreground-muted)">— ไม่มีสลิปในคิวนี้ —</td>
              </tr>
            ) : (
              rows.map((slip) => {
                const isActive = slip.id === activeId;
                return (
                  <tr
                    key={slip.id}
                    className="cursor-pointer border-b border-(--border) transition-colors"
                    style={{
                      background: isActive
                        ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                        : "transparent",
                    }}
                    onClick={() => select(slip.id)}
                  >
                    <td className="px-3 py-2.5">
                      <span className="mono text-[12px] text-(--foreground-muted)">{slip.refCode}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-[11px] font-semibold text-white">
                          {(slip.studentName || "?").trim().charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-ui font-medium text-(--foreground)">
                            {slip.studentName || slip.studentEmail || slip.refCode}
                          </div>
                          {slip.studentEmail && (
                            <div className="truncate text-caption text-(--foreground-muted)">{slip.studentEmail}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="truncate text-ui text-(--foreground)">{slip.courseTitle}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num text-[13px] font-semibold">{formatTHB(slip.expectedAmount)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-caption text-(--foreground-muted)">
                        {new Date(slip.createdAt).toLocaleDateString("th-TH")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          select(slip.id);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-uism text-(--foreground) transition-colors hover:bg-(--surface-muted)"
                      >
                        <Eye size={14} /> ดู
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {query.hasNextPage ? (
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="w-full border-t border-(--border) px-3 py-2.5 text-sm text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) disabled:opacity-50"
          >
            {query.isFetchingNextPage ? "กำลังโหลด…" : "โหลดเพิ่ม"}
          </button>
        ) : null}
      </div>

      {/* Slip Detail — desktop split-pane (always rendered as sibling, with
          empty state when no selection); mobile uses a fullscreen overlay
          dialog so the table doesn't shrink to nothing on small screens. */}
      <aside className="hidden min-w-0 lg:block lg:sticky lg:top-20">
        {active ? (
          <div
            className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[14px] border border-(--border) bg-(--surface) shadow-sm"
          >
            {/* Sheet header */}
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-(--border) px-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <SlipStatusChip status={active.status} />
                <span className="mono text-[13px] text-(--foreground-muted)">{active.refCode}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSelection(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
                  aria-label="ก่อนหน้า"
                >
                  <CaretUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSelection(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
                  aria-label="ถัดไป"
                >
                  <CaretDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
                  aria-label="ปิด"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Sheet body */}
            <div className="flex-1 overflow-y-auto">
              {/* Image viewer */}
              <div className="border-b border-(--border) bg-(--surface-sunken) p-5">
                {/* Prominent amount badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-caption font-semibold uppercase tracking-widest text-(--foreground-subtle)">ยอดชำระ</span>
                  <span className="num inline-flex items-baseline gap-1 rounded-[10px] bg-(--primary) px-3 py-1.5 text-[18px] font-bold text-white">
                    <Coins size={16} weight="bold" />
                    {parseInt(active.expectedAmount, 10).toLocaleString("th-TH")}
                    <span className="text-[12px] font-medium">บาท</span>
                  </span>
                </div>
                <SlipImageViewer slipId={active.id} />
              </div>

              {/* Meta panel */}
              <div className="flex flex-col gap-4 p-5">
                {/* Student card */}
                <div className="flex items-center gap-3 rounded-[14px] border border-(--border) bg-(--surface) p-3.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-[14px] font-semibold text-white">
                    {(active.studentName || "?").trim().slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-ui font-semibold text-(--foreground)">
                      {active.studentName || "ไม่ระบุชื่อ"}
                    </div>
                    <div className="text-caption text-(--foreground-muted)">{active.studentEmail}</div>
                  </div>
                </div>

                {/* Course card */}
                <div className="flex items-center gap-3 rounded-[14px] border border-(--border) bg-(--surface) p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
                    <Coins size={20} weight="bold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-ui font-semibold text-(--foreground)">{active.courseTitle}</div>
                    <div className="text-caption text-(--foreground-muted)">คอร์สเดี่ยว · เข้าถึงตลอดชีพ</div>
                  </div>
                </div>

                {/* Submitted info */}
                <div className="rounded-[14px] border border-(--border) bg-(--surface-muted) p-4">
                  <div className="mb-3 text-caption font-semibold uppercase tracking-widest text-(--foreground-subtle)">
                    ข้อมูลการชำระ
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                    <dt className="text-(--foreground-muted)">ส่งเมื่อ</dt>
                    <dd className="num">{new Date(active.createdAt).toLocaleString("th-TH")}</dd>
                    <dt className="text-(--foreground-muted)">ราคา</dt>
                    <dd className="num font-semibold text-(--foreground)">{formatTHB(active.expectedAmount)}</dd>
                    {active.reportedAmount && (
                      <>
                        <dt className="text-(--foreground-muted)">นักเรียนแจ้งยอด</dt>
                        <dd className="num">{formatTHB(active.reportedAmount)}</dd>
                      </>
                    )}
                    <dt className="text-(--foreground-muted)">รหัสอ้างอิง</dt>
                    <dd className="mono text-(--foreground)">{active.refCode}</dd>
                  </dl>
                </div>

                {active.status === "rejected" && active.rejectionReason && (
                  <div className="rounded-[14px] border border-(--destructive)/30 bg-(--destructive-bg)/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-(--destructive-fg)">
                      <Prohibit size={14} weight="fill" /> เหตุผลที่ปฏิเสธ
                    </div>
                    <p className="text-ui font-medium text-(--destructive-fg)">
                      {REJECT_REASON_LABEL[active.rejectionReason as (typeof REJECT_REASONS)[number]]
                        ?? active.rejectionReason}
                    </p>
                    {active.rejectionNote && (
                      <p className="mt-1 text-uism text-(--foreground-muted)">
                        {active.rejectionNote}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {rejectOpen && active.status === "submitted" && (
                  <div className="rounded-[14px] border border-(--border) bg-(--surface-muted) p-4">
                    <p className="mb-2 text-sm font-medium">เลือกเหตุผล</p>
                    <div className="flex flex-wrap gap-2">
                      {REJECT_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={busy}
                          onClick={() => reject(r)}
                          className="rounded-[8px] border border-(--border) bg-(--surface) px-2.5 py-1.5 text-sm transition-colors hover:bg-(--surface-muted) disabled:opacity-50"
                        >
                          {REJECT_REASON_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky action bar */}
            {active.status === "submitted" ? (
              <div className="flex shrink-0 items-center gap-2 border-t border-(--border) bg-(--surface) p-3.5">
                <button
                  type="button"
                  onClick={() => moveSelection(1)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-(--border) bg-(--surface-muted) py-3 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken) disabled:opacity-50"
                >
                  ข้าม
                  <span className="mono rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]">S</span>
                </button>
                <button
                  type="button"
                  ref={rejectButtonRef}
                  onClick={() => setRejectOpen((v) => !v)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-(--destructive) py-3 text-ui font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
                >
                  <Prohibit size={16} weight="bold" />
                  ปฏิเสธ
                  <span className="mono rounded bg-white/20 px-1 py-0.5 text-[10px]">R</span>
                </button>
                <button
                  type="button"
                  onClick={() => accept()}
                  disabled={busy}
                  className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-[10px] bg-(--accent) py-3 text-ui font-semibold text-white transition-colors hover:bg-(--accent-hover) disabled:opacity-50"
                >
                  <CheckCircle size={16} weight="bold" />
                  อนุมัติ
                  <span className="mono rounded bg-white/20 px-1 py-0.5 text-[10px]">A</span>
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2 border-t border-(--border) bg-(--surface) p-3.5">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-(--surface-muted) py-3 text-ui font-medium text-(--foreground-muted)">
                  <ArrowCounterClockwise size={16} />
                  สลิปนี้ถูก{active.status === "accepted" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-(--border) bg-(--surface) p-10 text-center">
            <p className="text-ui font-medium text-(--foreground)">
              เลือกสลิปจากรายการเพื่อดูรายละเอียด
            </p>
            <p className="text-uism text-(--foreground-muted)">
              คีย์ลัด: <span className="mono">j/k</span> เลื่อน · <span className="mono">a</span> อนุมัติ · <span className="mono">r</span> ปฏิเสธ · <span className="mono">Esc</span> ปิด
            </p>
          </div>
        )}
      </aside>

      {/* Mobile fallback: render as a fullscreen overlay sheet so the table
          can still hand off to the detail view on small screens. Reuses the
          same controls + state as desktop. */}
      {active && (
        <div
          className="fixed inset-0 z-40 flex justify-end lg:hidden"
          style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          <div
            className="flex h-full w-full max-w-[540px] flex-col bg-(--surface) shadow-lg"
            style={{ borderLeft: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <MobileSlipSheet
              active={active}
              busy={busy}
              error={error}
              rejectOpen={rejectOpen}
              setRejectOpen={setRejectOpen}
              accept={accept}
              reject={reject}
              moveSelection={moveSelection}
              onClose={clearSelection}
              rejectButtonRef={rejectButtonRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MobileSlipSheetProps {
  active: SlipRow;
  busy: boolean;
  error: string | null;
  rejectOpen: boolean;
  setRejectOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  accept: () => Promise<void> | void;
  reject: (
    reason: (typeof REJECT_REASONS)[number],
    note?: string,
  ) => Promise<void> | void;
  moveSelection: (delta: 1 | -1) => void;
  onClose: () => void;
  rejectButtonRef: React.RefObject<HTMLButtonElement | null>;
}

// Simplified copy of the desktop detail layout for the mobile overlay path.
// Kept as a small inline component so the desktop branch stays readable —
// the two trees diverge in a few props (no aside wrapper, hard close button)
// and would be noisy with a single render branch.
function MobileSlipSheet({
  active,
  busy,
  error,
  rejectOpen,
  setRejectOpen,
  accept,
  reject,
  moveSelection,
  onClose,
  rejectButtonRef,
}: MobileSlipSheetProps) {
  return (
    <>
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-(--border) px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <SlipStatusChip status={active.status} />
          <span className="mono text-[13px] text-(--foreground-muted)">{active.refCode}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveSelection(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
            aria-label="ก่อนหน้า"
          >
            <CaretUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => moveSelection(1)}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
            aria-label="ถัดไป"
          >
            <CaretDown size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
            aria-label="ปิด"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-(--border) bg-(--surface-sunken) p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-widest text-(--foreground-subtle)">
              ยอดชำระ
            </span>
            <span className="num inline-flex items-baseline gap-1 rounded-[10px] bg-(--primary) px-3 py-1.5 text-[18px] font-bold text-white">
              <Coins size={16} weight="bold" />
              {parseInt(active.expectedAmount, 10).toLocaleString("th-TH")}
              <span className="text-[12px] font-medium">บาท</span>
            </span>
          </div>
          <SlipImageViewer slipId={active.id} />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3 rounded-[14px] border border-(--border) bg-(--surface) p-3.5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-[14px] font-semibold text-white">
              {(active.studentName || "?").trim().slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-ui font-semibold text-(--foreground)">
                {active.studentName || "ไม่ระบุชื่อ"}
              </div>
              <div className="text-caption text-(--foreground-muted)">{active.studentEmail}</div>
            </div>
          </div>
          <div className="rounded-[14px] border border-(--border) bg-(--surface-muted) p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-(--foreground-muted)">คอร์ส</dt>
              <dd className="text-(--foreground)">{active.courseTitle}</dd>
              <dt className="text-(--foreground-muted)">ส่งเมื่อ</dt>
              <dd className="num">{new Date(active.createdAt).toLocaleString("th-TH")}</dd>
              <dt className="text-(--foreground-muted)">ราคา</dt>
              <dd className="num font-semibold text-(--foreground)">{formatTHB(active.expectedAmount)}</dd>
              <dt className="text-(--foreground-muted)">รหัสอ้างอิง</dt>
              <dd className="mono text-(--foreground)">{active.refCode}</dd>
            </dl>
          </div>
          {active.status === "rejected" && active.rejectionReason && (
            <div className="rounded-[14px] border border-(--destructive)/30 bg-(--destructive-bg)/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-(--destructive-fg)">
                <Prohibit size={14} weight="fill" /> เหตุผลที่ปฏิเสธ
              </div>
              <p className="text-ui font-medium text-(--destructive-fg)">
                {REJECT_REASON_LABEL[active.rejectionReason as (typeof REJECT_REASONS)[number]]
                  ?? active.rejectionReason}
              </p>
              {active.rejectionNote && (
                <p className="mt-1 text-uism text-(--foreground-muted)">
                  {active.rejectionNote}
                </p>
              )}
            </div>
          )}
          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {rejectOpen && active.status === "submitted" && (
            <div className="rounded-[14px] border border-(--border) bg-(--surface-muted) p-4">
              <p className="mb-2 text-sm font-medium">เลือกเหตุผล</p>
              <div className="flex flex-wrap gap-2">
                {REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => reject(r)}
                    className="rounded-[8px] border border-(--border) bg-(--surface) px-2.5 py-1.5 text-sm transition-colors hover:bg-(--surface-muted) disabled:opacity-50"
                  >
                    {REJECT_REASON_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {active.status === "submitted" ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-(--border) bg-(--surface) p-3.5">
          <button
            type="button"
            onClick={() => moveSelection(1)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-(--border) bg-(--surface-muted) py-3 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken) disabled:opacity-50"
          >
            ข้าม
          </button>
          <button
            type="button"
            ref={rejectButtonRef}
            onClick={() => setRejectOpen((v) => !v)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-(--destructive) py-3 text-ui font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
          >
            <Prohibit size={16} weight="bold" /> ปฏิเสธ
          </button>
          <button
            type="button"
            onClick={() => accept()}
            disabled={busy}
            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-[10px] bg-(--accent) py-3 text-ui font-semibold text-white transition-colors hover:bg-(--accent-hover) disabled:opacity-50"
          >
            <CheckCircle size={16} weight="bold" /> อนุมัติ
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 border-t border-(--border) bg-(--surface) p-3.5">
          <div className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-(--surface-muted) py-3 text-ui font-medium text-(--foreground-muted)">
            <ArrowCounterClockwise size={16} />
            สลิปนี้ถูก{active.status === "accepted" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว
          </div>
        </div>
      )}
    </>
  );
}

function SlipStatusChip({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-(--success-bg) px-2.5 py-0.5 text-[12px] font-medium text-(--success)">
        <CheckCircle size={11} weight="fill" /> อนุมัติแล้ว
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-(--destructive-bg) px-2.5 py-0.5 text-[12px] font-medium text-(--destructive)">
        <Prohibit size={11} weight="fill" /> ปฏิเสธแล้ว
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-(--warning-bg) px-2.5 py-0.5 text-[12px] font-medium text-(--warning-fg)">
        <Clock size={11} weight="fill" /> รอตรวจ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-(--surface-muted) px-2.5 py-0.5 text-[12px] font-medium text-(--foreground-muted)">
      <Clock size={11} /> {status}
    </span>
  );
}

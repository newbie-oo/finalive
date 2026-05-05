"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTHB } from "@/lib/format";
import type { SlipQueueStatus } from "@/server/repos/slip";
import { SlipDetailPanel } from "./slip-detail-panel";
import { REJECT_REASONS } from "./slip-reject-options";
import { Eye } from "@phosphor-icons/react";

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
	pagination: {
		next_cursor: string | null;
		per_page: number;
		has_next: boolean;
	};
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
				const body = (await res.json().catch(() => ({}))) as {
					message?: string;
				};
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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
				setError(
					`สำเร็จ ${body.succeeded?.length ?? 0} · ล้มเหลว ${body.failed.length}`,
				);
			}
			setSelected(new Set());
			await refresh();
		} finally {
			setBusy(false);
		}
	}, [effectiveSelected, busy, refresh]);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _bulkReject = useCallback(
		async (reason: (typeof REJECT_REASONS)[number]) => {
			if (effectiveSelected.size === 0 || busy) return;
			setBusy(true);
			setError(null);
			try {
				const res = await fetch("/api/admin/slips/bulk-reject", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						slipIds: Array.from(effectiveSelected),
						reason,
					}),
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
					setError(
						`สำเร็จ ${body.succeeded?.length ?? 0} · ล้มเหลว ${body.failed.length}`,
					);
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

	// Silence "value is never read" lint while keeping the implementations
	// for the pending bulk-actions redesign.
	void _bulkAccept;
	void _bulkReject;

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
					const body = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
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
			if (target?.matches("input, textarea, select, [contenteditable='true']"))
				return;
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
	}, [
		moveSelection,
		accept,
		rejectOpen,
		active,
		toggleSelected,
		bulkMode,
		activeId,
		sp,
		router,
	]);

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
				<table
					className="w-full border-collapse min-w-[520px]"
					style={{ tableLayout: "fixed" }}
				>
					<thead>
						<tr className="border-b border-(--border) bg-(--surface-muted)">
							<th
								className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
								style={{ width: 140 }}
							>
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
							<th
								className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
								style={{ width: 110 }}
							>
								จำนวน
							</th>
							<th
								className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-(--foreground-muted)"
								style={{ width: 100 }}
							>
								เวลา
							</th>
							<th className="px-3 py-2.5" style={{ width: 80 }} />
						</tr>
					</thead>
					<tbody>
						{query.isLoading && rows.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="p-4 text-caption text-(--foreground-muted)"
								>
									กำลังโหลด…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="p-4 text-caption text-(--foreground-muted)"
								>
									— ไม่มีสลิปในคิวนี้ —
								</td>
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
											<span className="mono text-[12px] text-(--foreground-muted)">
												{slip.refCode}
											</span>
										</td>
										<td className="px-3 py-2.5">
											<div className="flex items-center gap-2.5">
												<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-[11px] font-semibold text-white">
													{(slip.studentName || "?").trim().charAt(0)}
												</span>
												<div className="min-w-0">
													<div className="truncate text-ui font-medium text-(--foreground)">
														{slip.studentName ||
															slip.studentEmail ||
															slip.refCode}
													</div>
													{slip.studentEmail && (
														<div className="truncate text-caption text-(--foreground-muted)">
															{slip.studentEmail}
														</div>
													)}
												</div>
											</div>
										</td>
										<td className="px-3 py-2.5">
											<div className="truncate text-ui text-(--foreground)">
												{slip.courseTitle}
											</div>
										</td>
										<td className="px-3 py-2.5">
											<span className="num text-[13px] font-semibold">
												{formatTHB(slip.expectedAmount)}
											</span>
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
					<div className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[14px] border border-(--border) bg-(--surface) shadow-sm">
						<SlipDetailPanel
							slip={active}
							busy={busy}
							error={error}
							rejectOpen={rejectOpen}
							onReject={reject}
							onToggleReject={() => setRejectOpen((v) => !v)}
							onAccept={accept}
							onMovePrev={() => moveSelection(-1)}
							onMoveNext={() => moveSelection(1)}
							onClose={clearSelection}
							rejectButtonRef={rejectButtonRef}
							showKeyboardHints
						/>
					</div>
				) : (
					<div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-(--border) bg-(--surface) p-10 text-center">
						<p className="text-ui font-medium text-(--foreground)">
							เลือกสลิปจากรายการเพื่อดูรายละเอียด
						</p>
						<p className="text-uism text-(--foreground-muted)">
							คีย์ลัด: <span className="mono">j/k</span> เลื่อน ·{" "}
							<span className="mono">a</span> อนุมัติ ·{" "}
							<span className="mono">r</span> ปฏิเสธ ·{" "}
							<span className="mono">Esc</span> ปิด
						</p>
					</div>
				)}
			</aside>

			{/* Mobile fallback: render as a fullscreen overlay sheet so the table
          can still hand off to the detail view on small screens. Reuses the
          same controls + state as desktop. */}
			{active && (
				<div
					// z-[60] so the mobile dialog sits above the public shell's
					// sticky header (z-50) — otherwise the close button at the top
					// of the sheet was hidden under the brand bar on small screens.
					className="fixed inset-0 z-[60] flex justify-end lg:hidden"
					style={{
						background: "rgba(15,23,42,0.5)",
						backdropFilter: "blur(4px)",
					}}
					onClick={(e) => {
						if (e.target === e.currentTarget) clearSelection();
					}}
				>
					<div
						className="flex h-full w-full max-w-[540px] flex-col bg-(--surface) shadow-lg"
						style={{ borderLeft: "1px solid var(--border)" }}
						onClick={(e) => e.stopPropagation()}
					>
						<SlipDetailPanel
							slip={active}
							busy={busy}
							error={error}
							rejectOpen={rejectOpen}
							onReject={reject}
							onToggleReject={() => setRejectOpen((v) => !v)}
							onAccept={accept}
							onMovePrev={() => moveSelection(-1)}
							onMoveNext={() => moveSelection(1)}
							onClose={clearSelection}
							rejectButtonRef={rejectButtonRef}
							showKeyboardHints={false}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

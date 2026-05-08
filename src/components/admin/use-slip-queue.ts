"use client";

import {
	useInfiniteQuery,
	useQueryClient,
	type InfiniteData,
	type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlipQueueStatus } from "@/server/repos/slip";
import { queryKeys } from "@/lib/query-keys";
import type { SlipRow } from "./slip-table";
import { REJECT_REASONS } from "./slip-reject-options";

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

export interface UseSlipQueueResult {
	query: UseInfiniteQueryResult<InfiniteData<PageResponse>, Error>;
	rows: SlipRow[];
	activeId: string | undefined;
	active: SlipRow | null;
	activeIndex: number;
	select: (id: string) => void;
	moveSelection: (delta: 1 | -1) => void;
	busy: boolean;
	error: string | null;
	rejectOpen: boolean;
	setRejectOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
	rejectButtonRef: React.RefObject<HTMLButtonElement | null>;
	accept: () => Promise<void>;
	reject: (
		reason: (typeof REJECT_REASONS)[number],
		note?: string,
	) => Promise<void>;
	bulkMode: "none" | "reject";
	setBulkMode: (v: "none" | "reject") => void;
	selected: Set<string>;
	effectiveSelected: Set<string>;
	toggleSelected: (id: string) => void;
	bulkAccept: () => Promise<void>;
	bulkReject: (reason: (typeof REJECT_REASONS)[number]) => Promise<void>;
	refresh: () => Promise<void>;
	clearSelection: () => void;
}

export function useSlipQueue({
	status,
	initialSelectedId,
}: {
	status: SlipQueueStatus;
	initialSelectedId: string | undefined;
}): UseSlipQueueResult {
	const router = useRouter();
	const sp = useSearchParams();
	const qc = useQueryClient();

	const query = useInfiniteQuery({
		queryKey: queryKeys.adminSlips.byStatus(status),
		queryFn: ({ pageParam }) => fetchPage({ pageParam, status }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.pagination.next_cursor ?? undefined,
	});

	const rows = useMemo(
		() => query.data?.pages.flatMap((p) => p.data) ?? [],
		[query.data],
	);

	const activeId = initialSelectedId;
	const active = rows.find((r) => r.id === activeId) ?? null;
	const activeIndex = active ? rows.findIndex((r) => r.id === active.id) : -1;

	// Sync URL when selected id disappears from fetched rows
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
		await qc.invalidateQueries({ queryKey: queryKeys.adminSlips.all() });
		router.refresh();
	}, [qc, router]);

	async function runSlipAction(
		url: string,
		options: RequestInit,
		onSuccess?: () => void,
	): Promise<boolean> {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(url, options);
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					message?: string;
				};
				setError(body.message ?? `action failed (${res.status})`);
				return false;
			}
			onSuccess?.();
			await refresh();
			return true;
		} finally {
			setBusy(false);
		}
	}

	const accept = useCallback(async () => {
		if (!active || busy) return;
		if (active.status !== "submitted") return;
		await runSlipAction(`/api/admin/slips/${active.id}/accept`, {
			method: "POST",
		});
	}, [active, busy]);

	async function runBulkAction(
		endpoint: string,
		body: Record<string, unknown>,
		onSuccess?: () => void,
	) {
		if (effectiveSelected.size === 0 || busy) return;
		setBusy(true);
		setError(null);
		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = (await res.json().catch(() => ({}))) as {
				succeeded?: string[];
				failed?: Array<{ slipId: string; message: string }>;
				message?: string;
			};
			if (!res.ok) {
				setError(data.message ?? `bulk action failed (${res.status})`);
				return;
			}
			if (data.failed && data.failed.length > 0) {
				setError(
					`สำเร็จ ${data.succeeded?.length ?? 0} · ล้มเหลว ${data.failed.length}`,
				);
			}
			setSelected(new Set());
			onSuccess?.();
			await refresh();
		} finally {
			setBusy(false);
		}
	}

	const bulkAccept = useCallback(async () => {
		await runBulkAction("/api/admin/slips/bulk-accept", {
			slipIds: Array.from(effectiveSelected),
		});
	}, [effectiveSelected, busy, refresh]);

	const bulkReject = useCallback(
		async (reason: (typeof REJECT_REASONS)[number]) => {
			await runBulkAction(
				"/api/admin/slips/bulk-reject",
				{ slipIds: Array.from(effectiveSelected), reason },
				() => setBulkMode("none"),
			);
		},
		[effectiveSelected, busy, refresh],
	);

	const reject = useCallback(
		async (reason: (typeof REJECT_REASONS)[number], note?: string) => {
			if (!active || busy) return;
			if (active.status !== "submitted") return;
			await runSlipAction(
				`/api/admin/slips/${active.id}/reject`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ reason, note }),
				},
				() => setRejectOpen(false),
			);
		},
		[active, busy],
	);

	// Keyboard shortcuts
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

	return {
		query,
		rows,
		activeId,
		active,
		activeIndex,
		select,
		moveSelection,
		busy,
		error,
		rejectOpen,
		setRejectOpen,
		rejectButtonRef,
		accept,
		reject,
		bulkMode,
		setBulkMode,
		selected,
		effectiveSelected,
		toggleSelected,
		bulkAccept,
		bulkReject,
		refresh,
		clearSelection,
	};
}

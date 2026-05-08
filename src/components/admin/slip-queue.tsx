"use client";

import type { SlipQueueStatus } from "@/server/repos/slip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSlipQueue } from "./use-slip-queue";
import { SlipDetailPanel } from "./slip-detail-panel";
import { SlipTable } from "./slip-table";
import { SlipEmptyState } from "./slip-empty-state";
import { SlipMobileDrawer } from "./slip-mobile-drawer";

interface SlipQueueProps {
	status: SlipQueueStatus;
	initialSelectedId: string | undefined;
}

export function SlipQueue({ status, initialSelectedId }: SlipQueueProps) {
	const {
		rows,
		active,
		activeId,
		query,
		select,
		moveSelection,
		busy,
		error,
		rejectOpen,
		setRejectOpen,
		rejectButtonRef,
		accept,
		reject,
		clearSelection,
	} = useSlipQueue({ status, initialSelectedId });
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	return (
		<div
			className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start"
			style={{ minHeight: "calc(100vh - 3.5rem - 3rem)" }}
		>
			<SlipTable
				rows={rows}
				activeId={activeId}
				isLoading={query.isLoading}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				onSelect={select}
				onFetchNextPage={() => query.fetchNextPage()}
			/>

			<aside className="hidden min-w-0 lg:block lg:sticky lg:top-20">
				{active ? (
					<div className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-card border border-border bg-card shadow-xs">
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
					<SlipEmptyState />
				)}
			</aside>

			{active && isDesktop === false && (
				<SlipMobileDrawer
					slip={active}
					busy={busy}
					error={error}
					rejectOpen={rejectOpen}
					rejectButtonRef={rejectButtonRef}
					onAccept={accept}
					onReject={reject}
					onToggleReject={() => setRejectOpen((v) => !v)}
					onMovePrev={() => moveSelection(-1)}
					onMoveNext={() => moveSelection(1)}
					onClose={clearSelection}
				/>
			)}
		</div>
	);
}

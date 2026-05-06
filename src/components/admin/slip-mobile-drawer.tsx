"use client";

import { SlipDetailPanel } from "./slip-detail-panel";
import type { SlipRow } from "./slip-table";

interface SlipMobileDrawerProps {
	slip: SlipRow;
	busy: boolean;
	error: string | null;
	rejectOpen: boolean;
	rejectButtonRef: React.RefObject<HTMLButtonElement | null>;
	onAccept: () => void;
	onReject: (
		reason: typeof import("./slip-reject-options").REJECT_REASONS[number],
		note?: string,
	) => void;
	onToggleReject: () => void;
	onMovePrev: () => void;
	onMoveNext: () => void;
	onClose: () => void;
}

export function SlipMobileDrawer({
	slip,
	busy,
	error,
	rejectOpen,
	rejectButtonRef,
	onAccept,
	onReject,
	onToggleReject,
	onMovePrev,
	onMoveNext,
	onClose,
}: SlipMobileDrawerProps) {
	return (
		<div
			className="fixed inset-0 z-[60] flex justify-end lg:hidden"
			style={{
				background: "rgba(15,23,42,0.5)",
				backdropFilter: "blur(4px)",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="flex h-full w-full max-w-[540px] flex-col bg-(--surface) shadow-lg"
				style={{ borderLeft: "1px solid var(--border)" }}
				onClick={(e) => e.stopPropagation()}
			>
				<SlipDetailPanel
					slip={slip}
					busy={busy}
					error={error}
					rejectOpen={rejectOpen}
					onReject={onReject}
					onToggleReject={onToggleReject}
					onAccept={onAccept}
					onMovePrev={onMovePrev}
					onMoveNext={onMoveNext}
					onClose={onClose}
					rejectButtonRef={rejectButtonRef}
					showKeyboardHints={false}
				/>
			</div>
		</div>
	);
}

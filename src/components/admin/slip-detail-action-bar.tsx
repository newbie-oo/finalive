import {
	CheckCircle,
	Prohibit,
	ArrowCounterClockwise,
} from "@phosphor-icons/react/dist/ssr";

interface SlipDetailActionBarProps {
	status: string;
	busy: boolean;
	onAccept?: () => void;
	onToggleReject?: () => void;
	onMoveNext?: () => void;
	rejectButtonRef?: React.RefObject<HTMLButtonElement | null>;
	showKeyboardHints?: boolean;
}

const FRAME = "flex shrink-0 items-center gap-2 border-t border-border bg-card p-3.5";
const KBD_DARK = "mono rounded-sm border border-border bg-card px-1 py-0.5 text-[10px]";
const KBD_LIGHT = "mono rounded-sm bg-white/20 px-1 py-0.5 text-[10px]";

export function SlipDetailActionBar({
	status,
	busy,
	onAccept,
	onToggleReject,
	onMoveNext,
	rejectButtonRef,
	showKeyboardHints = false,
}: SlipDetailActionBarProps) {
	if (status !== "submitted") {
		return (
			<div className={FRAME}>
				<div className="flex flex-1 items-center justify-center gap-2 rounded-button bg-muted py-3 text-ui font-medium text-muted-foreground">
					<ArrowCounterClockwise size={16} />
					สลิปนี้ถูก{status === "accepted" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว
				</div>
			</div>
		);
	}

	return (
		<div className={FRAME}>
			{onMoveNext && (
				<button
					type="button"
					onClick={onMoveNext}
					disabled={busy}
					className="flex flex-1 items-center justify-center gap-1.5 rounded-button border border-border bg-muted py-3 text-ui font-medium text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-50"
				>
					ข้าม
					{showKeyboardHints && <span className={KBD_DARK}>S</span>}
				</button>
			)}
			{onToggleReject && (
				<button
					type="button"
					ref={rejectButtonRef}
					onClick={onToggleReject}
					disabled={busy}
					className="flex flex-1 items-center justify-center gap-1.5 rounded-button bg-destructive py-3 text-ui font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
				>
					<Prohibit size={16} weight="bold" />
					ปฏิเสธ
					{showKeyboardHints && <span className={KBD_LIGHT}>R</span>}
				</button>
			)}
			{onAccept && (
				<button
					type="button"
					onClick={onAccept}
					disabled={busy}
					className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-button bg-accent py-3 text-ui font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
				>
					<CheckCircle size={16} weight="bold" />
					อนุมัติ
					{showKeyboardHints && <span className={KBD_LIGHT}>A</span>}
				</button>
			)}
		</div>
	);
}

import { CaretUp, CaretDown, X } from "@phosphor-icons/react/dist/ssr";
import { SlipStatusChip } from "./slip-status-chip";

interface SlipDetailHeaderProps {
	status: string;
	refCode: string;
	onMovePrev?: () => void;
	onMoveNext?: () => void;
	onClose?: () => void;
}

const NAV_BUTTON_CLASS =
	"flex h-7 w-7 items-center justify-center rounded-nav text-foreground transition-colors hover:bg-muted";

export function SlipDetailHeader({
	status,
	refCode,
	onMovePrev,
	onMoveNext,
	onClose,
}: SlipDetailHeaderProps) {
	return (
		<div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-5">
			<div className="flex items-center gap-2.5 min-w-0">
				<SlipStatusChip status={status} />
				<span className="mono text-[13px] text-muted-foreground">{refCode}</span>
			</div>
			<div className="flex items-center gap-1">
				{onMovePrev && (
					<button
						type="button"
						onClick={onMovePrev}
						className={NAV_BUTTON_CLASS}
						aria-label="Previous"
					>
						<CaretUp size={14} />
					</button>
				)}
				{onMoveNext && (
					<button
						type="button"
						onClick={onMoveNext}
						className={NAV_BUTTON_CLASS}
						aria-label="Next"
					>
						<CaretDown size={14} />
					</button>
				)}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className={NAV_BUTTON_CLASS}
						aria-label="Close"
					>
						<X size={14} />
					</button>
				)}
			</div>
		</div>
	);
}

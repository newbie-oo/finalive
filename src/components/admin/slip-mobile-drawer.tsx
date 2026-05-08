"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { SlipDetailPanel } from "./slip-detail-panel";
import type { SlipRow } from "./slip-table";
import type { REJECT_REASONS } from "./slip-reject-options";

interface SlipMobileDrawerProps {
	slip: SlipRow;
	busy: boolean;
	error: string | null;
	rejectOpen: boolean;
	rejectButtonRef: React.RefObject<HTMLButtonElement | null>;
	onAccept: () => void;
	onReject: (reason: (typeof REJECT_REASONS)[number], note?: string) => void;
	onToggleReject: () => void;
	onMovePrev: () => void;
	onMoveNext: () => void;
	onClose: () => void;
}

/**
 * Mobile presentation of the slip detail. Uses shadcn `<Sheet side="bottom">`
 * so admins triaging slips on phones get a sliding bottom sheet with focus
 * trap, escape-to-close, and Radix-managed a11y. `<lg:hidden>` keeps it
 * mounted only at the relevant breakpoint.
 */
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
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="lg:hidden flex flex-col p-0 max-h-[92dvh] gap-0 rounded-t-card"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>รายละเอียดสลิป</SheetTitle>
					<SheetDescription>
						ตรวจสอบสลิปและเลือกอนุมัติหรือปฏิเสธ
					</SheetDescription>
				</SheetHeader>
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
			</SheetContent>
		</Sheet>
	);
}

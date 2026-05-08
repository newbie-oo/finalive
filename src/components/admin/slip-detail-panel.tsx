"use client";

import { formatTHB } from "@/lib/format";
import { SlipImageViewer } from "./slip-image-viewer";
import { REJECT_REASONS, REJECT_REASON_LABEL } from "./slip-reject-options";
import {
	CheckCircle,
	Prohibit,
	Coins,
	ArrowCounterClockwise,
	Clock,
	X,
	CaretUp,
	CaretDown,
} from "@phosphor-icons/react";

export interface SlipDetailData {
	id: string;
	status: string;
	expectedAmount: string;
	reportedAmount: string | null;
	rejectionReason: string | null;
	rejectionNote: string | null;
	createdAt: string;
	refCode: string;
	studentName: string | null;
	studentEmail: string | null;
	courseTitle: string;
}

interface SlipDetailPanelProps {
	slip: SlipDetailData;
	busy: boolean;
	error: string | null;
	rejectOpen: boolean;
	onReject: (reason: (typeof REJECT_REASONS)[number]) => void;
	onToggleReject?: () => void;
	onAccept?: () => void;
	onMovePrev?: () => void;
	onMoveNext?: () => void;
	onClose?: () => void;
	rejectButtonRef?: React.RefObject<HTMLButtonElement | null>;
	showKeyboardHints?: boolean;
}

export function SlipDetailPanel({
	slip,
	busy,
	error,
	rejectOpen,
	onReject,
	onToggleReject,
	onAccept,
	onMovePrev,
	onMoveNext,
	onClose,
	rejectButtonRef,
	showKeyboardHints = false,
}: SlipDetailPanelProps) {
	return (
		<>
			<div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-5">
				<div className="flex items-center gap-2.5 min-w-0">
					<SlipStatusChip status={slip.status} />
					<span className="mono text-[13px] text-muted-foreground">
						{slip.refCode}
					</span>
				</div>
				<div className="flex items-center gap-1">
					{onMovePrev && (
						<button
							type="button"
							onClick={onMovePrev}
							className="flex h-7 w-7 items-center justify-center rounded-nav text-foreground transition-colors hover:bg-muted"
							aria-label="Previous"
						>
							<CaretUp size={14} />
						</button>
					)}
					{onMoveNext && (
						<button
							type="button"
							onClick={onMoveNext}
							className="flex h-7 w-7 items-center justify-center rounded-nav text-foreground transition-colors hover:bg-muted"
							aria-label="Next"
						>
							<CaretDown size={14} />
						</button>
					)}
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="flex h-7 w-7 items-center justify-center rounded-nav text-foreground transition-colors hover:bg-muted"
							aria-label="Close"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="border-b border-border bg-surface-sunken p-5">
					<div className="mb-3 flex items-center justify-between">
						<span className="text-caption font-semibold uppercase tracking-widest text-foreground-subtle">
							ยอดชำระ
						</span>
						<span className="num inline-flex items-baseline gap-1 rounded-button bg-primary px-3 py-1.5 text-[18px] font-bold text-white">
							<Coins size={16} weight="bold" />
							{parseInt(slip.expectedAmount, 10).toLocaleString("th-TH")}
							<span className="text-[12px] font-medium">บาท</span>
						</span>
					</div>
					<SlipImageViewer slipId={slip.id} />
				</div>

				<div className="flex flex-col gap-4 p-5">
					<div className="flex items-center gap-3 rounded-card border border-border bg-card p-3.5">
						<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-avatar-from to-avatar-to text-[14px] font-semibold text-white">
							{(slip.studentName || "?").trim().slice(0, 2)}
						</span>
						<div className="min-w-0 flex-1">
							<div className="text-ui font-semibold text-foreground">
								{slip.studentName || "ไม่ระบุชื่อ"}
							</div>
							<div className="text-caption text-muted-foreground">
								{slip.studentEmail}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3 rounded-card border border-border bg-card p-3.5">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Coins size={20} weight="bold" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-ui font-semibold text-foreground">
								{slip.courseTitle}
							</div>
							<div className="text-caption text-muted-foreground">
								คอร์สเดี่ยว · เข้าถึงตลอดชีพ
							</div>
						</div>
					</div>

					<div className="rounded-card border border-border bg-muted p-4">
						<div className="mb-3 text-caption font-semibold uppercase tracking-widest text-foreground-subtle">
							ข้อมูลการชำระ
						</div>
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
							<dt className="text-muted-foreground">ส่งเมื่อ</dt>
							<dd className="num">
								{new Date(slip.createdAt).toLocaleString("th-TH")}
							</dd>
							<dt className="text-muted-foreground">ราคา</dt>
							<dd className="num font-semibold text-foreground">
								{formatTHB(slip.expectedAmount)}
							</dd>
							{slip.reportedAmount && (
								<>
									<dt className="text-muted-foreground">นักเรียนแจ้งยอด</dt>
									<dd className="num">{formatTHB(slip.reportedAmount)}</dd>
								</>
							)}
							<dt className="text-muted-foreground">รหัสอ้างอิง</dt>
							<dd className="mono text-foreground">{slip.refCode}</dd>
						</dl>
					</div>

					{slip.status === "rejected" && slip.rejectionReason && (
						<div className="rounded-card border border-destructive/30 bg-destructive-bg/40 p-4">
							<div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-destructive-foreground">
								<Prohibit size={14} weight="fill" /> เหตุผลที่ปฏิเสธ
							</div>
							<p className="text-ui font-medium text-destructive-foreground">
								{REJECT_REASON_LABEL[
									slip.rejectionReason as (typeof REJECT_REASONS)[number]
								] ?? slip.rejectionReason}
							</p>
							{slip.rejectionNote && (
								<p className="mt-1 text-uism text-muted-foreground">
									{slip.rejectionNote}
								</p>
							)}
						</div>
					)}

					{error && (
						<div className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{rejectOpen && slip.status === "submitted" && (
						<div className="rounded-card border border-border bg-muted p-4">
							<p className="mb-2 text-sm font-medium">เลือกเหตุผล</p>
							<div className="flex flex-wrap gap-2">
								{REJECT_REASONS.map((r) => (
									<button
										key={r}
										type="button"
										disabled={busy}
										onClick={() => onReject(r)}
										className="rounded-nav border border-border bg-card px-2.5 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
									>
										{REJECT_REASON_LABEL[r]}
									</button>
								))}
							</div>
						</div>
					)}

					{showKeyboardHints && (
						<p className="text-uism text-muted-foreground">
							คีย์ลัด: <span className="mono">j/k</span> เลื่อน ·{" "}
							<span className="mono">a</span> อนุมัติ ·{" "}
							<span className="mono">r</span> ปฏิเสธ ·{" "}
							<span className="mono">Esc</span> ปิด
						</p>
					)}
				</div>
			</div>

			{slip.status === "submitted" ? (
				<div className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3.5">
					{onMoveNext && (
						<button
							type="button"
							onClick={onMoveNext}
							disabled={busy}
							className="flex flex-1 items-center justify-center gap-1.5 rounded-button border border-border bg-muted py-3 text-ui font-medium text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-50"
						>
							ข้าม
							{showKeyboardHints && (
								<span className="mono rounded-sm border border-border bg-card px-1 py-0.5 text-[10px]">
									S
								</span>
							)}
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
							{showKeyboardHints && (
								<span className="mono rounded-sm bg-white/20 px-1 py-0.5 text-[10px]">
									R
								</span>
							)}
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
							{showKeyboardHints && (
								<span className="mono rounded-sm bg-white/20 px-1 py-0.5 text-[10px]">
									A
								</span>
							)}
						</button>
					)}
				</div>
			) : (
				<div className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3.5">
					<div className="flex flex-1 items-center justify-center gap-2 rounded-button bg-muted py-3 text-ui font-medium text-muted-foreground">
						<ArrowCounterClockwise size={16} />
						สลิปนี้ถูก{slip.status === "accepted" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว
					</div>
				</div>
			)}
		</>
	);
}

function SlipStatusChip({ status }: { status: string }) {
	if (status === "accepted") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[12px] font-medium text-success">
				<CheckCircle size={11} weight="fill" /> อนุมัติแล้ว
			</span>
		);
	}
	if (status === "rejected") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-destructive-bg px-2.5 py-0.5 text-[12px] font-medium text-destructive">
				<Prohibit size={11} weight="fill" /> ปฏิเสธแล้ว
			</span>
		);
	}
	if (status === "submitted") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-[12px] font-medium text-warning-foreground">
				<Clock size={11} weight="fill" /> รอตรวจ
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
			<Clock size={11} /> {status}
		</span>
	);
}

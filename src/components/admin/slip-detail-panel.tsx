"use client";

import { Coins, Prohibit } from "@phosphor-icons/react/dist/ssr";
import { formatTHB } from "@/lib/format";
import { SlipImageViewer } from "./slip-image-viewer";
import { REJECT_REASONS, REJECT_REASON_LABEL } from "./slip-reject-options";
import { RejectWizard } from "./reject-wizard";
import { SlipDetailHeader } from "./slip-detail-header";
import { SlipDetailActionBar } from "./slip-detail-action-bar";
import { UserTrustBlock, type UserTrustSignals } from "./user-trust-block";

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
	/** Optional trust signals — populated by the queue when available. */
	studentTrust?: UserTrustSignals;
}

interface SlipDetailPanelProps {
	slip: SlipDetailData;
	busy: boolean;
	error: string | null;
	rejectOpen: boolean;
	onReject: (reason: (typeof REJECT_REASONS)[number], note?: string) => void;
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
			<SlipDetailHeader
				status={slip.status}
				refCode={slip.refCode}
				onMovePrev={onMovePrev}
				onMoveNext={onMoveNext}
				onClose={onClose}
			/>

			<div className="flex-1 overflow-y-auto">
				<AmountAndImage slip={slip} />

				<div className="flex flex-col gap-4 p-5">
					<StudentCard
						name={slip.studentName}
						email={slip.studentEmail}
					/>

					{slip.studentTrust && <UserTrustBlock signals={slip.studentTrust} />}

					<CourseCard title={slip.courseTitle} />

					<PaymentInfo slip={slip} />

					{slip.status === "rejected" && slip.rejectionReason && (
						<RejectionDetails
							reason={slip.rejectionReason}
							note={slip.rejectionNote}
						/>
					)}

					{error && (
						<div className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{rejectOpen && slip.status === "submitted" && (
						<RejectWizard
							busy={busy}
							onCancel={() => onToggleReject?.()}
							onSubmit={({ reason, note }) => onReject(reason, note)}
						/>
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

			<SlipDetailActionBar
				status={slip.status}
				busy={busy}
				onAccept={onAccept}
				onToggleReject={onToggleReject}
				onMoveNext={onMoveNext}
				rejectButtonRef={rejectButtonRef}
				showKeyboardHints={showKeyboardHints}
			/>
		</>
	);
}

function AmountAndImage({ slip }: { slip: SlipDetailData }) {
	return (
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
	);
}

function StudentCard({
	name,
	email,
}: {
	name: string | null;
	email: string | null;
}) {
	return (
		<div className="flex items-center gap-3 rounded-card border border-border bg-card p-3.5">
			<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-avatar-from to-avatar-to text-[14px] font-semibold text-white">
				{(name || "?").trim().slice(0, 2)}
			</span>
			<div className="min-w-0 flex-1">
				<div className="text-ui font-semibold text-foreground">
					{name || "ไม่ระบุชื่อ"}
				</div>
				<div className="text-caption text-muted-foreground">{email}</div>
			</div>
		</div>
	);
}

function CourseCard({ title }: { title: string }) {
	return (
		<div className="flex items-center gap-3 rounded-card border border-border bg-card p-3.5">
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Coins size={20} weight="bold" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-ui font-semibold text-foreground">{title}</div>
				<div className="text-caption text-muted-foreground">
					คอร์สเดี่ยว · เข้าถึงตลอดชีพ
				</div>
			</div>
		</div>
	);
}

function PaymentInfo({ slip }: { slip: SlipDetailData }) {
	return (
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
	);
}

function RejectionDetails({
	reason,
	note,
}: {
	reason: string;
	note: string | null;
}) {
	return (
		<div className="rounded-card border border-destructive/30 bg-destructive-bg/40 p-4">
			<div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-destructive-foreground">
				<Prohibit size={14} weight="fill" /> เหตุผลที่ปฏิเสธ
			</div>
			<p className="text-ui font-medium text-destructive-foreground">
				{REJECT_REASON_LABEL[reason as (typeof REJECT_REASONS)[number]] ?? reason}
			</p>
			{note && <p className="mt-1 text-uism text-muted-foreground">{note}</p>}
		</div>
	);
}

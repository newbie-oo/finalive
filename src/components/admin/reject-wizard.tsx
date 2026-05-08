"use client";

import { useState } from "react";
import { CaretLeft, CaretRight, Prohibit } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	REJECT_REASONS,
	REJECT_REASON_LABEL,
	type RejectReason,
} from "./slip-reject-options";

interface RejectWizardProps {
	busy: boolean;
	onCancel: () => void;
	onSubmit: (payload: { reason: RejectReason; note?: string }) => void;
}

type Step = 1 | 2 | 3;

const NOTE_LIMIT = 500;

/**
 * 3-step reject flow shown inline in the slip detail panel. Splits a
 * decision (which can include a free-text note) into smaller commitments
 * — pick a reason, optionally explain, confirm — so admins triaging fast
 * don't accidentally fire a destructive action and so the user gets a
 * specific reason rather than a generic 'ปฏิเสธ' bounce.
 */
export function RejectWizard({ busy, onCancel, onSubmit }: RejectWizardProps) {
	const [step, setStep] = useState<Step>(1);
	const [reason, setReason] = useState<RejectReason | null>(null);
	const [note, setNote] = useState("");

	const trimmedNote = note.trim();
	const noteOverLimit = trimmedNote.length > NOTE_LIMIT;

	function next() {
		if (step === 1 && reason) setStep(2);
		else if (step === 2 && !noteOverLimit) setStep(3);
	}
	function back() {
		if (step === 2) setStep(1);
		else if (step === 3) setStep(2);
	}

	function handleSubmit() {
		if (!reason) return;
		onSubmit({
			reason,
			note: trimmedNote ? trimmedNote : undefined,
		});
	}

	return (
		<div className="rounded-card border border-border bg-muted p-4">
			<StepHeader step={step} />

			{step === 1 && (
				<RadioGroup
					value={reason ?? ""}
					onValueChange={(v) => setReason(v as RejectReason)}
					className="grid gap-2"
				>
					{REJECT_REASONS.map((r) => (
						<label
							key={r}
							className="flex cursor-pointer items-center gap-3 rounded-card border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
						>
							<RadioGroupItem id={`reason-${r}`} value={r} />
							<span className="text-ui text-foreground">
								{REJECT_REASON_LABEL[r]}
							</span>
						</label>
					))}
				</RadioGroup>
			)}

			{step === 2 && (
				<div>
					<Label htmlFor="reject-note">หมายเหตุถึงผู้ใช้ (ไม่บังคับ)</Label>
					<textarea
						id="reject-note"
						value={note}
						onChange={(e) => setNote(e.target.value)}
						maxLength={NOTE_LIMIT + 50}
						placeholder="ข้อความนี้จะส่งให้ผู้ใช้พร้อมเหตุผล"
						className="mt-1.5 min-h-[120px] w-full resize-y rounded-input border border-border bg-card px-3 py-2 text-ui text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30"
					/>
					<div className="mt-1 flex items-center justify-between text-uism">
						<span className="text-muted-foreground">
							ผู้ใช้จะเห็นทั้งเหตุผลและหมายเหตุนี้ในอีเมลแจ้งผล
						</span>
						<span
							className={
								noteOverLimit
									? "text-destructive"
									: "num text-muted-foreground"
							}
						>
							{trimmedNote.length}/{NOTE_LIMIT}
						</span>
					</div>
				</div>
			)}

			{step === 3 && reason && (
				<div className="space-y-3 rounded-card border border-border bg-card p-3.5">
					<h3 className="text-ui font-semibold text-foreground">
						ยืนยันการปฏิเสธ
					</h3>
					<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-uism">
						<dt className="text-muted-foreground">เหตุผล</dt>
						<dd className="text-foreground">
							{REJECT_REASON_LABEL[reason]}
						</dd>
						{trimmedNote && (
							<>
								<dt className="text-muted-foreground">หมายเหตุ</dt>
								<dd className="whitespace-pre-wrap text-foreground">
									{trimmedNote}
								</dd>
							</>
						)}
					</dl>
				</div>
			)}

			<div className="mt-4 flex items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={busy}
				>
					ยกเลิก
				</Button>
				<div className="flex items-center gap-2">
					{step > 1 && (
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={back}
							disabled={busy}
						>
							<CaretLeft size={14} weight="bold" />
							ก่อนหน้า
						</Button>
					)}
					{step < 3 && (
						<Button
							type="button"
							variant="primary"
							size="sm"
							onClick={next}
							disabled={busy || (step === 1 ? !reason : noteOverLimit)}
						>
							ถัดไป
							<CaretRight size={14} weight="bold" />
						</Button>
					)}
					{step === 3 && (
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={handleSubmit}
							disabled={busy || !reason}
						>
							<Prohibit size={14} weight="bold" />
							ปฏิเสธสลิป
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function StepHeader({ step }: { step: Step }) {
	const labels: Record<Step, string> = {
		1: "เลือกเหตุผล",
		2: "หมายเหตุ",
		3: "ยืนยัน",
	};
	return (
		<div className="mb-3 flex items-center gap-2 text-uism">
			{[1, 2, 3].map((i) => {
				const active = i === step;
				const done = i < step;
				return (
					<div key={i} className="flex flex-1 items-center gap-2">
						<span
							className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-uism font-semibold ${
								done
									? "border-success bg-success text-white"
									: active
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-card text-muted-foreground"
							}`}
						>
							{i}
						</span>
						<span
							className={
								active
									? "font-semibold text-foreground"
									: "text-muted-foreground"
							}
						>
							{labels[i as Step]}
						</span>
						{i < 3 && (
							<span className="ml-1 hidden flex-1 border-t border-dashed border-border sm:block" />
						)}
					</div>
				);
			})}
		</div>
	);
}

import {
	Calendar,
	ShieldCheck,
	Warning,
} from "@phosphor-icons/react/dist/ssr";

export interface UserTrustSignals {
	/** When the user's account was created. Used to derive account-age signal. */
	readonly accountCreatedAt?: Date;
	/** Number of payments this user has had accepted in the past. */
	readonly successfulPaymentCount?: number;
	/** Number of times this user's slips have been rejected before. */
	readonly previouslyRejectedCount?: number;
}

interface UserTrustBlockProps {
	signals: UserTrustSignals;
}

/**
 * Quick-scan trust signals for the admin reviewing a slip. Renders one chip
 * per signal it knows about; returns null when given no signals at all so
 * the slip detail panel never shows an empty "trust" header. Adds reviewer
 * confidence when accepting or context when rejecting.
 */
export function UserTrustBlock({ signals }: UserTrustBlockProps) {
	const chips: React.ReactNode[] = [];

	if (signals.accountCreatedAt) {
		const months = monthsBetween(signals.accountCreatedAt, new Date());
		chips.push(
			<TrustChip
				key="account-age"
				tone="neutral"
				icon={<Calendar size={12} />}
				label={accountAgeLabel(months)}
			/>,
		);
	}

	if (
		typeof signals.successfulPaymentCount === "number" &&
		signals.successfulPaymentCount > 0
	) {
		chips.push(
			<TrustChip
				key="payments"
				tone="success"
				icon={<ShieldCheck size={12} weight="fill" />}
				label={`ชำระสำเร็จ ${signals.successfulPaymentCount} ครั้ง`}
			/>,
		);
	}

	if (typeof signals.previouslyRejectedCount === "number") {
		if (signals.previouslyRejectedCount === 0) {
			chips.push(
				<TrustChip
					key="rejections-zero"
					tone="success"
					icon={<ShieldCheck size={12} weight="fill" />}
					label="ไม่เคยถูกปฏิเสธ"
				/>,
			);
		} else {
			chips.push(
				<TrustChip
					key="rejections"
					tone="destructive"
					icon={<Warning size={12} weight="fill" />}
					label={`เคยถูกปฏิเสธ ${signals.previouslyRejectedCount} ครั้ง`}
				/>,
			);
		}
	}

	if (chips.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-caption font-semibold tracking-widest text-foreground-subtle uppercase">
				ความน่าเชื่อถือ
			</span>
			{chips}
		</div>
	);
}

/** Whole calendar months between two dates, floored to >= 0. */
function monthsBetween(from: Date, to: Date): number {
	const years = to.getFullYear() - from.getFullYear();
	const months = to.getMonth() - from.getMonth();
	const total = years * 12 + months - (to.getDate() < from.getDate() ? 1 : 0);
	return Math.max(0, total);
}

function accountAgeLabel(months: number): string {
	if (months < 1) return "สมัครภายในเดือนนี้";
	if (months < 12) return `สมัคร ${months} เดือน`;
	const years = Math.floor(months / 12);
	const remaining = months % 12;
	if (remaining === 0) return `สมัคร ${years} ปี`;
	return `สมัคร ${years} ปี ${remaining} เดือน`;
}

interface TrustChipProps {
	tone: "neutral" | "success" | "destructive";
	icon: React.ReactNode;
	label: string;
}

const TONE_CLASS: Record<TrustChipProps["tone"], string> = {
	neutral: "border-border bg-muted text-foreground",
	success: "border-success/30 bg-success-bg text-success-foreground",
	destructive:
		"border-destructive/30 bg-destructive-bg text-destructive-foreground",
};

function TrustChip({ tone, icon, label }: TrustChipProps) {
	return (
		<span
			data-tone={tone}
			className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-uism font-medium ${TONE_CLASS[tone]}`}
		>
			{icon}
			{label}
		</span>
	);
}

import { CheckCircle, Prohibit, Clock } from "@phosphor-icons/react/dist/ssr";

const BASE =
	"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium";

interface SlipStatusChipProps {
	status: string;
}

export function SlipStatusChip({ status }: SlipStatusChipProps) {
	if (status === "accepted") {
		return (
			<span className={`${BASE} bg-success-bg text-success`}>
				<CheckCircle size={11} weight="fill" /> อนุมัติแล้ว
			</span>
		);
	}
	if (status === "rejected") {
		return (
			<span className={`${BASE} bg-destructive-bg text-destructive`}>
				<Prohibit size={11} weight="fill" /> ปฏิเสธแล้ว
			</span>
		);
	}
	if (status === "submitted") {
		return (
			<span className={`${BASE} bg-warning-bg text-warning-foreground`}>
				<Clock size={11} weight="fill" /> รอตรวจ
			</span>
		);
	}
	return (
		<span className={`${BASE} bg-muted text-muted-foreground`}>
			<Clock size={11} /> {status}
		</span>
	);
}

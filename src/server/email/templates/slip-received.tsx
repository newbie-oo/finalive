import { Text } from "@react-email/components";
import { EmailShell, MetaRow } from "../components/email-shell";

export interface SlipReceivedProps {
	name: string;
	courseTitle: string;
	refCode: string;
	amount: string;
}

export function SlipReceived({
	name,
	courseTitle,
	refCode,
	amount,
}: SlipReceivedProps) {
	return (
		<EmailShell preview="ได้รับสลิปแล้ว — Finalive" heading="ได้รับสลิปแล้ว">
			<Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
			<Text className="text-base text-slate-700">
				เราได้รับสลิปการชำระเงินของคุณแล้ว ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง
			</Text>
			<MetaRow label="คอร์ส" value={courseTitle} />
			<MetaRow label="เลขอ้างอิง" value={refCode} />
			<MetaRow label="ยอดที่ตรวจสอบ" value={amount} />
		</EmailShell>
	);
}

export const slipReceivedSubject = "ได้รับสลิปแล้ว — Finalive";

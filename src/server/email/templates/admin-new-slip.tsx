import { Text } from "@react-email/components";
import { EmailShell, MetaRow, PrimaryButton } from "../components/email-shell";

export interface AdminNewSlipProps {
	studentEmail: string;
	courseTitle: string;
	refCode: string;
	amount: string;
	reviewUrl: string;
}

export function AdminNewSlip({
	studentEmail,
	courseTitle,
	refCode,
	amount,
	reviewUrl,
}: AdminNewSlipProps) {
	return (
		<EmailShell preview="สลิปใหม่รอตรวจ — Finalive Admin" heading="สลิปใหม่รอตรวจ">
			<Text className="text-base text-slate-700">มีสลิปใหม่รอ admin ตรวจสอบ</Text>
			<MetaRow label="นักเรียน" value={studentEmail} />
			<MetaRow label="คอร์ส" value={courseTitle} />
			<MetaRow label="เลขอ้างอิง" value={refCode} />
			<MetaRow label="ยอดที่แจ้ง" value={amount} />
			<PrimaryButton href={reviewUrl}>เปิด slip queue</PrimaryButton>
		</EmailShell>
	);
}

export const adminNewSlipSubject = "สลิปใหม่รอตรวจ — Finalive Admin";

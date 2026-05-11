import { Text } from "@react-email/components";
import { EmailShell, PrimaryButton } from "../components/email-shell";

export interface PasswordResetProps {
	name: string;
	url: string;
}

export function PasswordReset({ name, url }: PasswordResetProps) {
	return (
		<EmailShell preview="รีเซ็ตรหัสผ่าน — Finalive" heading="รีเซ็ตรหัสผ่าน">
			<Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
			<Text className="text-base text-slate-700">
				คลิกปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ
			</Text>
			<PrimaryButton href={url}>รีเซ็ตรหัสผ่าน</PrimaryButton>
			<Text className="text-sm text-slate-500">
				ลิงก์นี้ใช้ได้ภายใน 1 ชั่วโมง หากคุณไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใดๆ
			</Text>
		</EmailShell>
	);
}

export const passwordResetSubject = "รีเซ็ตรหัสผ่าน — Finalive";

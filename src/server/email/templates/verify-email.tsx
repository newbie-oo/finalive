import { Text } from "@react-email/components";
import { EmailShell, PrimaryButton } from "../components/email-shell";

export interface VerifyEmailProps {
  name: string;
  url: string;
}

export function VerifyEmail({ name, url }: VerifyEmailProps) {
  return (
    <EmailShell
      preview="ยืนยันอีเมลของคุณ — Finalive"
      heading="ยืนยันอีเมลของคุณ"
    >
      <Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
      <Text className="text-base text-slate-700">
        ยืนยันอีเมลของคุณเพื่อเริ่มใช้งาน Finalive
      </Text>
      <PrimaryButton href={url}>ยืนยันอีเมล</PrimaryButton>
      <Text className="text-sm text-slate-500">ลิงก์นี้ใช้ได้ภายใน 7 วัน</Text>
    </EmailShell>
  );
}

export const verifyEmailSubject = "ยืนยันอีเมลของคุณ — Finalive";

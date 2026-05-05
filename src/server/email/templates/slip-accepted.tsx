import { Text } from "@react-email/components";
import { EmailShell, MetaRow, PrimaryButton } from "../components/email-shell";

export interface SlipAcceptedProps {
  name: string;
  courseTitle: string;
  courseSlug: string;
  refCode: string;
  amount: string;
  baseUrl: string;
}

export function SlipAccepted({
  name,
  courseTitle,
  courseSlug,
  refCode,
  amount,
  baseUrl,
}: SlipAcceptedProps) {
  const learnUrl = `${baseUrl}/learn/${courseSlug}`;
  return (
    <EmailShell
      preview="ได้รับสิทธิ์เรียนแล้ว — Finalive"
      heading="ได้รับสิทธิ์เรียนแล้ว"
    >
      <Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
      <Text className="text-base text-slate-700">
        ทีมงานได้ยืนยันการชำระเงินของคุณแล้ว สามารถเริ่มเรียนคอร์ส {courseTitle}{" "}
        ได้ทันที
      </Text>
      <MetaRow label="คอร์ส" value={courseTitle} />
      <MetaRow label="เลขอ้างอิง" value={refCode} />
      <MetaRow label="ยอด" value={amount} />
      <PrimaryButton href={learnUrl}>เริ่มเรียน</PrimaryButton>
    </EmailShell>
  );
}

export const slipAcceptedSubject = "ได้รับสิทธิ์เรียนแล้ว — Finalive";

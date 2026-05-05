import { Text } from "@react-email/components";
import { EmailShell, MetaRow, PrimaryButton } from "../components/email-shell";

export interface SlipRejectedProps {
  name: string;
  courseTitle: string;
  refCode: string;
  amount: string;
  reasonLabel: string;
  note: string | null;
  baseUrl: string;
}

export function SlipRejected({
  name,
  courseTitle,
  refCode,
  amount,
  reasonLabel,
  note,
  baseUrl,
}: SlipRejectedProps) {
  // Pending bounces back to awaiting_payment, so /checkout/by-ref/<refCode>
  // is the safe re-entry: server resolves the active pending and lands the
  // user on the slip upload step.
  const retryUrl = `${baseUrl}/checkout/by-ref/${refCode}`;
  return (
    <EmailShell
      preview="สลิปยังตรวจไม่ผ่าน — Finalive"
      heading="สลิปยังตรวจไม่ผ่าน"
    >
      <Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
      <Text className="text-base text-slate-700">
        ทีมงานยังไม่สามารถยืนยันสลิปของคุณสำหรับคอร์ส {courseTitle} ได้
        คุณสามารถส่งสลิปใหม่ได้
      </Text>
      <MetaRow label="คอร์ส" value={courseTitle} />
      <MetaRow label="เลขอ้างอิง" value={refCode} />
      <MetaRow label="ยอด" value={amount} />
      <MetaRow label="เหตุผล" value={reasonLabel} />
      {note ? <MetaRow label="หมายเหตุ" value={note} /> : null}
      <PrimaryButton href={retryUrl}>ส่งสลิปใหม่</PrimaryButton>
    </EmailShell>
  );
}

export const slipRejectedSubject = "สลิปยังตรวจไม่ผ่าน — Finalive";

import { Text } from "@react-email/components";
import { EmailShell, MetaRow, PrimaryButton } from "../components/email-shell";

export interface GrantCourseProps {
  name: string;
  courseTitle: string;
  learnUrl: string;
}

export function GrantCourse({ name, courseTitle, learnUrl }: GrantCourseProps) {
  return (
    <EmailShell
      preview="คุณได้รับสิทธิ์เข้าเรียนคอร์ส — Finalive"
      heading="🎁 ยินดีด้วย!"
    >
      <Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
      <Text className="text-base text-slate-700">
        คุณได้รับสิทธิ์เข้าเรียนคอร์ส {courseTitle} ฟรี
      </Text>
      <MetaRow label="คอร์ส" value={courseTitle} />
      <PrimaryButton href={learnUrl}>เริ่มเรียน</PrimaryButton>
    </EmailShell>
  );
}

export const grantCourseSubject = "คุณได้รับสิทธิ์เข้าเรียนคอร์ส — Finalive";

import { Text } from "@react-email/components";
import { EmailShell, MetaRow, PrimaryButton } from "../components/email-shell";

export interface CourseCompletedProps {
	name: string;
	courseTitle: string;
	certCode: string;
	verifyUrl: string;
	pdfUrl: string;
}

export function CourseCompleted({
	name,
	courseTitle,
	certCode,
	verifyUrl,
	pdfUrl,
}: CourseCompletedProps) {
	return (
		<EmailShell
			preview="ยินดีด้วย! คุณสำเร็จการศึกษาแล้ว — Finalive"
			heading="🎉 ยินดีด้วย!"
		>
			<Text className="text-base text-slate-700">สวัสดีคุณ {name},</Text>
			<Text className="text-base text-slate-700">
				คุณได้สำเร็จการศึกษาคอร์ส {courseTitle} เรียบร้อยแล้ว
			</Text>
			<MetaRow label="คอร์ส" value={courseTitle} />
			<MetaRow label="เลขที่ใบรับรอง" value={certCode} />
			<PrimaryButton href={verifyUrl}>ตรวจสอบใบรับรอง</PrimaryButton>
			<Text className="mt-4 text-sm text-slate-500">
				ดาวน์โหลด PDF: <a href={pdfUrl}>{pdfUrl}</a>
			</Text>
		</EmailShell>
	);
}

export const courseCompletedSubject = "ยินดีด้วย! คุณสำเร็จการศึกษาแล้ว — Finalive";

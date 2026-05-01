import "server-only";
import { enqueueEmail } from "./email-queue";
import { getEnv } from "@/lib/env";

export interface CourseCompletionNotifier {
	notify(params: {
		recipientEmail: string;
		studentName: string;
		courseTitle: string;
		certCode: string;
		pdfUrl: string;
		userId: string;
	}): Promise<void>;
}

export class EmailCourseCompletionNotifier implements CourseCompletionNotifier {
	async notify(params: {
		recipientEmail: string;
		studentName: string;
		courseTitle: string;
		certCode: string;
		pdfUrl: string;
		userId: string;
	}): Promise<void> {
		const env = getEnv();
		const baseUrl = env.BETTER_AUTH_URL.replace(/\/$/, "");
		await enqueueEmail({
			toEmail: params.recipientEmail,
			template: "course_completed",
			userId: params.userId,
			paramsJson: {
				name: params.studentName,
				courseTitle: params.courseTitle,
				certCode: params.certCode,
				verifyUrl: `${baseUrl}/verify/${params.certCode}`,
				pdfUrl: params.pdfUrl,
			},
		});
	}
}

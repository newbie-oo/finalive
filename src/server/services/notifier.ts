import "server-only";
import {
	enqueueEmail,
	type EmailQueueWriter,
} from "@/server/repos/email-queue";
import { getEnv } from "@/lib/env";
import type { EmailPayload } from "@/server/email/templates";

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
	private enqueue: (
		toEmail: string,
		payload: EmailPayload,
		userId?: string | null,
	) => Promise<string>;

	constructor(writer: EmailQueueWriter) {
		this.enqueue = (toEmail, payload, userId) =>
			enqueueEmail(writer, toEmail, payload, userId);
	}

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
		await this.enqueue(
			params.recipientEmail,
			{
				template: "course_completed",
				params: {
					name: params.studentName,
					courseTitle: params.courseTitle,
					certCode: params.certCode,
					verifyUrl: `${baseUrl}/verify/${params.certCode}`,
					pdfUrl: params.pdfUrl,
				},
			},
			params.userId,
		);
	}
}

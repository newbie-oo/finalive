import "server-only";
import { getEnv } from "@/lib/env";
import {
	sendEmail,
	type EmailQueueRepo,
} from "@/server/repos/email-queue";
import type { EmailPayload } from "@/server/email/templates";

export interface SlipNotifier {
	notifyStudentOfSlipReceipt(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		refCode: string;
		amount: number;
		userId: string;
	}): Promise<void>;

	notifyAdminOfNewSlip(params: {
		adminEmail: string;
		studentEmail: string;
		courseTitle: string;
		refCode: string;
		amount: number;
	}): Promise<void>;

	notifyStudentOfSlipAcceptance(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		courseSlug: string;
		refCode: string;
		amount: number;
		userId: string;
	}): Promise<void>;

	notifyStudentOfSlipRejection(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		courseSlug: string;
		refCode: string;
		amount: number;
		reasonLabel: string;
		note: string | null;
		userId: string;
	}): Promise<void>;
}

export class EmailSlipNotifier implements SlipNotifier {
	private send: (
		toEmail: string,
		payload: EmailPayload,
		userId?: string | null,
	) => Promise<string>;

	constructor(repo: EmailQueueRepo) {
		this.send = (toEmail, payload, userId) =>
			sendEmail(repo, toEmail, payload, userId);
	}

	async notifyStudentOfSlipReceipt(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		refCode: string;
		amount: number;
		userId: string;
	}): Promise<void> {
		await this.send(
			params.toEmail,
			{
				template: "slip_received",
				params: {
					name: params.studentName,
					courseTitle: params.courseTitle,
					refCode: params.refCode,
					amount: String(params.amount),
				},
			},
			params.userId,
		);
	}

	async notifyAdminOfNewSlip(params: {
		adminEmail: string;
		studentEmail: string;
		courseTitle: string;
		refCode: string;
		amount: number;
	}): Promise<void> {
		await this.send(params.adminEmail, {
			template: "admin_new_slip",
			params: {
				studentEmail: params.studentEmail,
				courseTitle: params.courseTitle,
				refCode: params.refCode,
				amount: String(params.amount),
				reviewUrl: "/admin/slips",
			},
		});
	}

	async notifyStudentOfSlipAcceptance(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		courseSlug: string;
		refCode: string;
		amount: number;
		userId: string;
	}): Promise<void> {
		const baseUrl = getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
		await this.send(
			params.toEmail,
			{
				template: "slip_accepted",
				params: {
					name: params.studentName,
					courseTitle: params.courseTitle,
					courseSlug: params.courseSlug,
					refCode: params.refCode,
					amount: String(params.amount),
					baseUrl,
				},
			},
			params.userId,
		);
	}

	async notifyStudentOfSlipRejection(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		courseSlug: string;
		refCode: string;
		amount: number;
		reasonLabel: string;
		note: string | null;
		userId: string;
	}): Promise<void> {
		const baseUrl = getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
		await this.send(
			params.toEmail,
			{
				template: "slip_rejected",
				params: {
					name: params.studentName,
					courseTitle: params.courseTitle,
					refCode: params.refCode,
					amount: String(params.amount),
					reasonLabel: params.reasonLabel,
					note: params.note,
					baseUrl,
				},
			},
			params.userId,
		);
	}
}

import "server-only";
import { enqueueEmail } from "./email-queue";

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
	async notifyStudentOfSlipReceipt(params: {
		toEmail: string;
		studentName: string;
		courseTitle: string;
		refCode: string;
		amount: number;
		userId: string;
	}): Promise<void> {
		await enqueueEmail({
			toEmail: params.toEmail,
			template: "slip_received",
			userId: params.userId,
			paramsJson: {
				name: params.studentName,
				courseTitle: params.courseTitle,
				refCode: params.refCode,
				amount: params.amount,
			},
		});
	}

	async notifyAdminOfNewSlip(params: {
		adminEmail: string;
		studentEmail: string;
		courseTitle: string;
		refCode: string;
		amount: number;
	}): Promise<void> {
		await enqueueEmail({
			toEmail: params.adminEmail,
			template: "admin_new_slip",
			paramsJson: {
				studentEmail: params.studentEmail,
				courseTitle: params.courseTitle,
				refCode: params.refCode,
				amount: params.amount,
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
		await enqueueEmail({
			toEmail: params.toEmail,
			template: "slip_accepted",
			userId: params.userId,
			paramsJson: {
				name: params.studentName,
				courseTitle: params.courseTitle,
				courseSlug: params.courseSlug,
				refCode: params.refCode,
				amount: params.amount,
			},
		});
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
		await enqueueEmail({
			toEmail: params.toEmail,
			template: "slip_rejected",
			userId: params.userId,
			paramsJson: {
				name: params.studentName,
				courseTitle: params.courseTitle,
				courseSlug: params.courseSlug,
				refCode: params.refCode,
				amount: params.amount,
				reasonLabel: params.reasonLabel,
				note: params.note,
			},
		});
	}
}

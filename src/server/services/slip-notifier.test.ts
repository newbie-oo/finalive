import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const sendEmailMock = vi.fn();
vi.mock("@/server/repos/email-queue", () => ({
	sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/env", () => ({
	getEnv: () => ({ BETTER_AUTH_URL: "https://app.example.com/" }),
}));

import { EmailSlipNotifier } from "./slip-notifier";
import type { EmailQueueRepo } from "@/server/repos/email-queue";

const fakeRepo: EmailQueueRepo = {
	recordEmail: vi.fn().mockResolvedValue({ id: "queued-id" }),
};

beforeEach(() => {
	sendEmailMock.mockReset();
	sendEmailMock.mockResolvedValue("queued-id");
});

describe("EmailSlipNotifier", () => {
	it("notifies the student that a slip was received", async () => {
		const notifier = new EmailSlipNotifier(fakeRepo);

		await notifier.notifyStudentOfSlipReceipt({
			toEmail: "stu@example.com",
			studentName: "Alice",
			courseTitle: "วิเคราะห์งบ",
			refCode: "REF-123",
			amount: 1500,
			userId: "u-1",
		});

		expect(sendEmailMock).toHaveBeenCalledTimes(1);
		const [, toEmail, payload, userId] = sendEmailMock.mock.calls[0]!;
		expect(toEmail).toBe("stu@example.com");
		expect(payload).toEqual({
			template: "slip_received",
			params: {
				name: "Alice",
				courseTitle: "วิเคราะห์งบ",
				refCode: "REF-123",
				amount: "1500",
			},
		});
		expect(userId).toBe("u-1");
	});

	it("notifies the admin without a userId on the email job", async () => {
		const notifier = new EmailSlipNotifier(fakeRepo);

		await notifier.notifyAdminOfNewSlip({
			adminEmail: "admin@example.com",
			studentEmail: "stu@example.com",
			courseTitle: "Excel",
			refCode: "REF-9",
			amount: 990,
		});

		const [, toEmail, payload, userId] = sendEmailMock.mock.calls[0]!;
		expect(toEmail).toBe("admin@example.com");
		expect(payload).toEqual({
			template: "admin_new_slip",
			params: {
				studentEmail: "stu@example.com",
				courseTitle: "Excel",
				refCode: "REF-9",
				amount: "990",
				reviewUrl: "/admin/slips",
			},
		});
		// Admin email is not tied to a student userId.
		expect(userId).toBeUndefined();
	});

	it("strips the trailing slash from BETTER_AUTH_URL when building accept link context", async () => {
		const notifier = new EmailSlipNotifier(fakeRepo);

		await notifier.notifyStudentOfSlipAcceptance({
			toEmail: "stu@example.com",
			studentName: "Bob",
			courseTitle: "C",
			courseSlug: "c",
			refCode: "R",
			amount: 100,
			userId: "u-2",
		});

		const [, , payload] = sendEmailMock.mock.calls[0]!;
		expect(payload.params.baseUrl).toBe("https://app.example.com");
		expect(payload.template).toBe("slip_accepted");
	});

	it("forwards rejection reason and note verbatim", async () => {
		const notifier = new EmailSlipNotifier(fakeRepo);

		await notifier.notifyStudentOfSlipRejection({
			toEmail: "stu@example.com",
			studentName: "Cara",
			courseTitle: "C",
			courseSlug: "c",
			refCode: "R",
			amount: 200,
			reasonLabel: "ยอดไม่ตรง",
			note: "ขาดอีก 50 บาท",
			userId: "u-3",
		});

		const [, , payload] = sendEmailMock.mock.calls[0]!;
		expect(payload.template).toBe("slip_rejected");
		expect(payload.params.reasonLabel).toBe("ยอดไม่ตรง");
		expect(payload.params.note).toBe("ขาดอีก 50 บาท");
	});

	it("preserves null note", async () => {
		const notifier = new EmailSlipNotifier(fakeRepo);

		await notifier.notifyStudentOfSlipRejection({
			toEmail: "stu@example.com",
			studentName: "Dora",
			courseTitle: "C",
			courseSlug: "c",
			refCode: "R",
			amount: 200,
			reasonLabel: "อื่น ๆ",
			note: null,
			userId: "u-4",
		});

		const [, , payload] = sendEmailMock.mock.calls[0]!;
		expect(payload.params.note).toBeNull();
	});
});

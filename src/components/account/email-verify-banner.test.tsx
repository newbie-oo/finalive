import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailVerifyBanner } from "./email-verify-banner";

const sendVerificationEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		sendVerificationEmail: (args: unknown) => sendVerificationEmail(args),
	},
}));

describe("EmailVerifyBanner", () => {
	beforeEach(() => {
		sendVerificationEmail.mockReset();
	});

	it("renders the unverified copy and a resend button", () => {
		render(<EmailVerifyBanner email="me@example.com" />);
		expect(screen.getByText(/ยืนยันอีเมล/)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /ส่งลิงก์ยืนยัน/ }),
		).toBeInTheDocument();
	});

	it("calls authClient.sendVerificationEmail with the user's email when clicked", async () => {
		sendVerificationEmail.mockResolvedValue({ data: { ok: true } });
		render(<EmailVerifyBanner email="me@example.com" />);
		fireEvent.click(screen.getByRole("button", { name: /ส่งลิงก์ยืนยัน/ }));
		await waitFor(() =>
			expect(sendVerificationEmail).toHaveBeenCalledWith({
				email: "me@example.com",
			}),
		);
	});

	it("shows a success message after a successful resend", async () => {
		sendVerificationEmail.mockResolvedValue({ data: { ok: true } });
		render(<EmailVerifyBanner email="me@example.com" />);
		fireEvent.click(screen.getByRole("button", { name: /ส่งลิงก์ยืนยัน/ }));
		expect(await screen.findByText(/ส่งลิงก์ไปที่อีเมลแล้ว/)).toBeInTheDocument();
	});
});

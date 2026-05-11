import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { VerifyEmail, verifyEmailSubject } from "./verify-email";
import { PasswordReset, passwordResetSubject } from "./password-reset";

describe("email templates", () => {
	it("verify-email renders Thai heading + url + Finalive shell", async () => {
		const html = await render(
			VerifyEmail({ name: "สมชาย", url: "https://x/y?token=abc" }),
		);
		expect(html).toContain("ยืนยันอีเมล");
		expect(html).toContain("สมชาย");
		expect(html).toContain("https://x/y?token=abc");
		expect(html).toContain("Finalive");
	});

	it("password-reset renders + has subject", async () => {
		const html = await render(
			PasswordReset({ name: "Som", url: "https://x/reset?t=z" }),
		);
		expect(html).toContain("รีเซ็ตรหัสผ่าน");
		expect(html).toContain("https://x/reset?t=z");
		expect(passwordResetSubject).toContain("รีเซ็ตรหัสผ่าน");
		expect(verifyEmailSubject).toContain("ยืนยันอีเมล");
	});

	it("templates emit plaintext (no html tags) when plainText=true", async () => {
		const text = await render(VerifyEmail({ name: "T", url: "https://x" }), {
			plainText: true,
		});
		expect(text).not.toMatch(/<html/i);
		expect(text).toContain("https://x");
	});
});

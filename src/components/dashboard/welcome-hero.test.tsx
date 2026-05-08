import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WelcomeHero } from "./welcome-hero";

describe("WelcomeHero", () => {
	it("greets the student by first name", () => {
		render(<WelcomeHero firstName="ฟ้า" />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/ฟ้า/);
	});

	it("falls back to a generic greeting when no name is provided", () => {
		render(<WelcomeHero firstName={null} />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			/ยินดีต้อนรับ/,
		);
	});

	it("offers a single primary CTA pointing at the catalog", () => {
		render(<WelcomeHero firstName="x" />);
		const cta = screen.getByRole("link", { name: /ดูคอร์สทั้งหมด/ });
		expect(cta).toHaveAttribute("href", "/courses");
	});

	it("teaches the 3-step onboarding flow alongside the welcome", () => {
		render(<WelcomeHero firstName="x" />);
		// Each step label sits in its own span so we can match it cleanly
		// without picking up similar substrings in the body copy.
		expect(screen.getByText("เลือกคอร์ส")).toBeInTheDocument();
		expect(screen.getByText("ชำระเงิน")).toBeInTheDocument();
		expect(screen.getByText("เริ่มเรียน")).toBeInTheDocument();
	});
});

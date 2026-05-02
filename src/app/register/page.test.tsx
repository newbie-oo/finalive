import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import RegisterPage from "./page";

// Mock dependencies
vi.mock("@/lib/auth-client", () => ({
	signUp: { email: vi.fn().mockResolvedValue({}) },
	useSession: () => ({ data: null }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	useSearchParams: () => ({ get: vi.fn() }),
}));

vi.mock("@/components/auth/google-sign-in-button", () => ({
	GoogleSignInButton: () => <div data-testid="google-btn">Google</div>,
}));

describe("RegisterPage", () => {
	it("updates strength meter on password input", () => {
		render(<RegisterPage />);

		const passwordInput = document.getElementById(
			"password",
		) as HTMLInputElement;
		fireEvent.change(passwordInput, { target: { value: "weak" } });

		// Strength meter should not show any colored bars yet (less than 8 chars)
		const bars = document.querySelectorAll(".h-1.rounded-full");
		expect(bars.length).toBe(4);
		expect(bars[0]).not.toHaveClass("bg-red-500");

		fireEvent.change(passwordInput, { target: { value: "Password1!" } });

		// Re-query bars after React re-render
		const barsAfter = document.querySelectorAll(".h-1.rounded-full");
		expect(barsAfter.length).toBe(4);

		// Now all 4 bars should be green
		expect(barsAfter[0]).toHaveClass("bg-green-500");
		expect(barsAfter[1]).toHaveClass("bg-green-500");
		expect(barsAfter[2]).toHaveClass("bg-green-500");
		expect(barsAfter[3]).toHaveClass("bg-green-500");
	});
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import VerifyEmailPage from "./page";

function renderPage() {
	return render(
		<TooltipProvider>
			<VerifyEmailPage />
		</TooltipProvider>,
	);
}

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		// Reject so the page enters its error state.
		verifyEmail: vi.fn().mockResolvedValue({
			error: { message: "expired" },
		}),
	},
	useSession: () => ({ data: null, isPending: false }),
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: () => "bad-token" }),
}));

describe("VerifyEmailPage error recovery", () => {
	it("offers a path back to login when verification fails", async () => {
		renderPage();

		// The form auto-submits on mount; wait for the failure state to render.
		await waitFor(() => {
			expect(screen.getByText(/ไม่สามารถยืนยันได้/)).toBeInTheDocument();
		});

		// Recovery: the user must have an actionable next step. Copy is
		// disambiguated from the public header's bare "เข้าสู่ระบบ" link.
		expect(
			screen.getByRole("link", { name: /ไปหน้าเข้าสู่ระบบ/ }),
		).toHaveAttribute("href", "/login");
	});

	it("surfaces a support contact line on failure", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getByText(/ไม่สามารถยืนยันได้/)).toBeInTheDocument();
		});

		// Tertiary support hint so a stuck user has somewhere to turn.
		expect(screen.getByText(/ติดต่อทีมงาน/)).toBeInTheDocument();
	});
});

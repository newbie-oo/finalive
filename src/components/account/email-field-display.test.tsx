import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailFieldDisplay } from "./email-field-display";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
	writeText.mockClear();
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText },
		configurable: true,
	});
});

describe("EmailFieldDisplay", () => {
	it("renders the email value", () => {
		render(<EmailFieldDisplay email="me@example.com" />);
		expect(screen.getByText("me@example.com")).toBeInTheDocument();
	});

	it("copies the email to the clipboard when 'คัดลอก' is clicked", async () => {
		render(<EmailFieldDisplay email="me@example.com" />);
		fireEvent.click(screen.getByRole("button", { name: /คัดลอก/ }));
		await waitFor(() =>
			expect(writeText).toHaveBeenCalledWith("me@example.com"),
		);
	});

	it("toggles the button label to 'คัดลอกแล้ว' after a successful copy", async () => {
		render(<EmailFieldDisplay email="me@example.com" />);
		fireEvent.click(screen.getByRole("button", { name: /คัดลอก/ }));
		expect(
			await screen.findByRole("button", { name: /คัดลอกแล้ว/ }),
		).toBeInTheDocument();
	});
});

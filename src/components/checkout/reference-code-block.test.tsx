import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReferenceCodeBlock } from "./reference-code-block";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("ReferenceCodeBlock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
	});

	it("renders the reference code as monospace text inside a labelled region", () => {
		render(<ReferenceCodeBlock value="ABCD-1234" />);
		const region = screen.getByRole("group", { name: /เลขอ้างอิง/ });
		expect(region).toBeInTheDocument();
		const code = screen.getByText("ABCD-1234");
		expect(code).toHaveClass("mono");
	});

	it("supports a custom label", () => {
		render(<ReferenceCodeBlock value="X" label="Order ID" />);
		expect(
			screen.getByRole("group", { name: /Order ID/ }),
		).toBeInTheDocument();
	});

	it("copies the value to the clipboard and confirms via toast on click", async () => {
		const { toast } = await import("sonner");
		render(<ReferenceCodeBlock value="ABCD-1234" />);

		const button = screen.getByRole("button", { name: /คัดลอก/ });
		await act(async () => {
			fireEvent.click(button);
			await Promise.resolve();
		});

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCD-1234");
		expect(toast.success).toHaveBeenCalled();
	});

	it("shows a transient confirmation state for two seconds after copying", async () => {
		render(<ReferenceCodeBlock value="ABCD-1234" />);
		const button = screen.getByRole("button", { name: /คัดลอก/ });

		await act(async () => {
			fireEvent.click(button);
			await Promise.resolve();
		});

		// Right after copy: button shows the copied confirmation copy.
		expect(button).toHaveAccessibleName(/คัดลอกแล้ว/);

		// After the timeout window the button reverts to the default label.
		await act(async () => {
			vi.advanceTimersByTime(2000);
		});
		expect(button).toHaveAccessibleName(/คัดลอก/);
		expect(button).not.toHaveAccessibleName(/คัดลอกแล้ว/);
	});

	it("surfaces an error toast when the clipboard write fails", async () => {
		const { toast } = await import("sonner");
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
		});

		render(<ReferenceCodeBlock value="X" />);
		const button = screen.getByRole("button", { name: /คัดลอก/ });
		await act(async () => {
			fireEvent.click(button);
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(toast.error).toHaveBeenCalled();
	});
});

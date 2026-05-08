import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
	it("renders the default Thai title and body when no copy is provided", () => {
		render(<ErrorState />);
		expect(screen.getByText(/เกิดข้อผิดพลาด/)).toBeInTheDocument();
		// Body copy is the muted fallback line.
		expect(
			screen.getByText(/ไม่สามารถโหลดหน้าได้/),
		).toBeInTheDocument();
	});

	it("respects a custom title and body", () => {
		render(<ErrorState title="โหลดข้อมูลไม่ได้" body="ลองรีโหลดอีกครั้ง" />);
		expect(screen.getByText("โหลดข้อมูลไม่ได้")).toBeInTheDocument();
		expect(screen.getByText("ลองรีโหลดอีกครั้ง")).toBeInTheDocument();
	});

	it("renders a retry button that calls onRetry on click", () => {
		const onRetry = vi.fn();
		render(<ErrorState onRetry={onRetry} />);
		fireEvent.click(screen.getByRole("button", { name: /ลองใหม่/ }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("renders a home link when homeHref is provided", () => {
		render(<ErrorState homeHref="/" />);
		expect(
			screen.getByRole("link", { name: /กลับหน้าหลัก/ }),
		).toHaveAttribute("href", "/");
	});

	it("surfaces an error id in monospace for support reference", () => {
		render(<ErrorState errorId="abc-123" />);
		const id = screen.getByText(/abc-123/);
		expect(id).toHaveClass("mono");
	});

	it("uses an alert role so screen readers announce errors immediately", () => {
		render(<ErrorState />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});

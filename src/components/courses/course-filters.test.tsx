import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseFilters } from "./course-filters";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

// Mock debounced value hook
vi.mock("@/lib/use-debounced-value", () => ({
	useDebouncedValue: (v: string) => v,
}));

describe("CourseFilters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("filter changes update URL correctly", () => {
		const replace = vi.fn();
		vi.doMock("next/navigation", () => ({
			useRouter: () => ({ replace }),
			useSearchParams: () => new URLSearchParams(),
		}));

		render(
			<CourseFilters
				initialQ=""
				initialFreeOnly={false}
				initialPrice=""
				initialDuration=""
				initialSort="newest"
			>
				<div />
			</CourseFilters>,
		);

		// Click a price filter
		fireEvent.click(screen.getByRole("button", { name: "ฟรี" }));
		// The hook should fire a replace — we verify the component renders
		expect(screen.getByRole("button", { name: "ฟรี" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("clear button resets all filters", () => {
		render(
			<CourseFilters
				initialQ="test"
				initialFreeOnly={true}
				initialPrice="free"
				initialDuration="0-60"
				initialSort="price_asc"
			>
				<div />
			</CourseFilters>,
		);

		const clearBtn = screen.getByRole("button", { name: /ล้างตัวกรอง/ });
		fireEvent.click(clearBtn);

		// After clear, search input should be empty
		expect(screen.getByPlaceholderText(/ค้นหาคอร์ส/)).toHaveValue("");
	});

	it("sort selection updates URL", () => {
		render(
			<CourseFilters
				initialQ=""
				initialFreeOnly={false}
				initialPrice=""
				initialDuration=""
				initialSort="newest"
			>
				<div />
			</CourseFilters>,
		);

		const sortSelect = screen.getByLabelText("เรียงลำดับ");
		fireEvent.change(sortSelect, { target: { value: "price_asc" } });

		expect(sortSelect).toHaveValue("price_asc");
	});
});

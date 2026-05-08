import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnrollmentsFilterBar } from "./enrollments-filter-bar";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
	usePathname: () => "/account/enrollments",
}));

describe("EnrollmentsFilterBar", () => {
	it("renders all tabs with their counts", () => {
		render(
			<EnrollmentsFilterBar
				active="all"
				sort="newest"
				counts={{ all: 5, in_progress: 3, completed: 2, pending: 1 }}
			/>,
		);
		expect(screen.getByRole("tab", { name: /ทั้งหมด.*5/ })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /กำลังเรียน.*3/ }),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /จบแล้ว.*2/ })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /รอดำเนินการ.*1/ }),
		).toBeInTheDocument();
	});

	it("highlights the active tab via aria-selected", () => {
		render(
			<EnrollmentsFilterBar
				active="in_progress"
				sort="newest"
				counts={{ all: 5, in_progress: 3, completed: 2, pending: 0 }}
			/>,
		);
		expect(
			screen.getByRole("tab", { name: /กำลังเรียน/ }),
		).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: /ทั้งหมด/ })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("changes sort via the select", () => {
		replace.mockReset();
		render(
			<EnrollmentsFilterBar
				active="all"
				sort="newest"
				counts={{ all: 5, in_progress: 3, completed: 2, pending: 0 }}
			/>,
		);
		fireEvent.change(screen.getByLabelText("เรียงตาม"), {
			target: { value: "alpha" },
		});
		expect(replace).toHaveBeenCalledWith(
			expect.stringMatching(/sort=alpha/),
			expect.any(Object),
		);
	});
});

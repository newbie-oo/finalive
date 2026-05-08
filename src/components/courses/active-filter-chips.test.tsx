import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveFilterChips } from "./active-filter-chips";

describe("ActiveFilterChips", () => {
	it("renders nothing when no filters are active", () => {
		const { container } = render(
			<ActiveFilterChips q="" freeOnly={false} price="" duration="" sort="" />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders one chip per active filter with a removal link", () => {
		render(
			<ActiveFilterChips
				q="dcf"
				freeOnly={false}
				price="1-1000"
				duration="60-300"
				sort="popular"
			/>,
		);
		// 4 active filters → 4 chips + 1 "ล้างทั้งหมด" link
		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(5);

		// Search chip clears the q param.
		const searchChip = screen.getByRole("link", { name: /ค้นหา.*dcf/ });
		expect(searchChip).toHaveAttribute("href", expect.stringMatching(/^\/courses\??/));
		expect(searchChip.getAttribute("href")).not.toContain("q=");

		// Clear-all link drops every filter.
		const clearAll = screen.getByRole("link", { name: /ล้างทั้งหมด/ });
		expect(clearAll).toHaveAttribute("href", "/courses");
	});

	it("preserves unrelated filters when removing one", () => {
		render(
			<ActiveFilterChips
				q="dcf"
				freeOnly={true}
				price=""
				duration=""
				sort=""
			/>,
		);
		const freeChip = screen.getByRole("link", { name: /ฟรีเท่านั้น/ });
		// Removing the free filter keeps q=dcf.
		expect(freeChip.getAttribute("href")).toMatch(/q=dcf/);
		expect(freeChip.getAttribute("href")).not.toMatch(/free=/);
	});

	it("hides the clear-all link when only one filter is active", () => {
		render(
			<ActiveFilterChips
				q="dcf"
				freeOnly={false}
				price=""
				duration=""
				sort=""
			/>,
		);
		expect(screen.queryByRole("link", { name: /ล้างทั้งหมด/ })).toBeNull();
	});
});

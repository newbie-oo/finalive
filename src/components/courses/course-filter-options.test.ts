import { describe, it, expect } from "vitest";
import { getActiveQuickFilter } from "./course-filter-options";

describe("getActiveQuickFilter", () => {
	it("returns null when a search query is active", () => {
		expect(
			getActiveQuickFilter({
				q: "stock",
				freeOnly: false,
				price: "",
				duration: "",
				sortBy: "newest",
			}),
		).toBeNull();
	});

	it("returns 'free' when freeOnly is true", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: true,
				price: "",
				duration: "",
				sortBy: "newest",
			}),
		).toBe("free");
	});

	it("returns 'free' when price is 'free'", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: false,
				price: "free",
				duration: "",
				sortBy: "newest",
			}),
		).toBe("free");
	});

	it("returns 'duration' when duration matches the chip range", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: false,
				price: "",
				duration: "60-300",
				sortBy: "newest",
			}),
		).toBe("duration");
	});

	it("returns 'popular' for sort=popular without other facets", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: false,
				price: "",
				duration: "",
				sortBy: "popular",
			}),
		).toBe("popular");
	});

	it("returns 'all' for sort=newest with no facets", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: false,
				price: "",
				duration: "",
				sortBy: "newest",
			}),
		).toBe("all");
	});

	it("returns null when sort=popular is combined with a price facet", () => {
		expect(
			getActiveQuickFilter({
				q: "",
				freeOnly: false,
				price: "1-1000",
				duration: "",
				sortBy: "popular",
			}),
		).toBeNull();
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCourseFilters } from "./use-course-filters";

const replaceMock = vi.fn();
const stableRouter = { replace: replaceMock };
// Return the same object on every call so React.useEffect's router dep is stable.
vi.mock("next/navigation", () => ({
	useRouter: () => stableRouter,
}));

const defaults = {
	initialQ: "",
	initialFreeOnly: false,
	initialPrice: "",
	initialDuration: "",
	initialSort: "newest",
};

beforeEach(() => {
	replaceMock.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useCourseFilters", () => {
	it("does not push to the URL on the initial mount", () => {
		renderHook(() => useCourseFilters(defaults));
		// The 300ms debounce hasn't even started for the initial render.
		act(() => vi.advanceTimersByTime(500));
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it("does not push synchronously on setQ; pushes after the debounce window", () => {
		const { result } = renderHook(() => useCourseFilters(defaults));
		act(() => result.current.setQ("stock"));

		// setQ alone must not push — that's the whole point of the debounce.
		expect(replaceMock).not.toHaveBeenCalled();

		act(() => vi.advanceTimersByTime(400));
		expect(replaceMock).toHaveBeenCalledWith("/courses?q=stock", {
			scroll: false,
		});
	});

	it("emits the bare /courses path when every filter resets to default", () => {
		const { result } = renderHook(() =>
			useCourseFilters({ ...defaults, initialPrice: "1-1000" }),
		);
		act(() => result.current.setPrice(""));
		act(() => vi.advanceTimersByTime(400));

		expect(replaceMock).toHaveBeenLastCalledWith("/courses", { scroll: false });
	});

	it("encodes free / price / duration / non-default sort into query params", () => {
		const { result } = renderHook(() => useCourseFilters(defaults));
		act(() => {
			result.current.setFreeOnly(true);
			result.current.setPrice("1-1000");
			result.current.setDuration("60-300");
			result.current.setSortBy("popular");
		});
		act(() => vi.advanceTimersByTime(400));

		const lastUrl = replaceMock.mock.calls.at(-1)![0] as string;
		expect(lastUrl).toContain("free=1");
		expect(lastUrl).toContain("price=1-1000");
		expect(lastUrl).toContain("duration=60-300");
		expect(lastUrl).toContain("sort=popular");
	});

	it("does not include sort=newest (the default) in the URL", () => {
		const { result } = renderHook(() => useCourseFilters(defaults));
		act(() => result.current.setFreeOnly(true));
		act(() => vi.advanceTimersByTime(400));

		const lastUrl = replaceMock.mock.calls.at(-1)![0] as string;
		expect(lastUrl).not.toContain("sort=");
	});

	it("hasFilters reflects every facet flipping back to default", () => {
		const { result } = renderHook(() =>
			useCourseFilters({ ...defaults, initialPrice: "1-1000" }),
		);
		expect(result.current.hasFilters).toBe(true);

		act(() => result.current.setPrice(""));
		expect(result.current.hasFilters).toBe(false);
	});

	it("clearAll resets q + every facet at once", () => {
		const { result } = renderHook(() =>
			useCourseFilters({
				...defaults,
				initialQ: "x",
				initialFreeOnly: true,
				initialPrice: "1-1000",
				initialSort: "popular",
			}),
		);

		act(() => result.current.clearAll());

		expect(result.current.q).toBe("");
		expect(result.current.freeOnly).toBe(false);
		expect(result.current.price).toBe("");
		expect(result.current.duration).toBe("");
		expect(result.current.sortBy).toBe("newest");
	});

	it("applyQuickFilter('free') toggles the free chip on and off", () => {
		const { result } = renderHook(() => useCourseFilters(defaults));

		act(() => result.current.applyQuickFilter("free"));
		expect(result.current.price).toBe("free");

		act(() => result.current.applyQuickFilter("free"));
		expect(result.current.price).toBe("");
	});

	it("applyQuickFilter('popular') sets sort and clears every facet", () => {
		const { result } = renderHook(() =>
			useCourseFilters({
				...defaults,
				initialPrice: "1-1000",
				initialFreeOnly: true,
			}),
		);

		act(() => result.current.applyQuickFilter("popular"));

		expect(result.current.sortBy).toBe("popular");
		expect(result.current.price).toBe("");
		expect(result.current.freeOnly).toBe(false);
	});

	it("applyQuickFilter('all') clears every facet back to defaults", () => {
		const { result } = renderHook(() =>
			useCourseFilters({
				...defaults,
				initialQ: "x",
				initialPrice: "1-1000",
				initialSort: "popular",
			}),
		);

		act(() => result.current.applyQuickFilter("all"));

		expect(result.current.q).toBe("");
		expect(result.current.price).toBe("");
		expect(result.current.sortBy).toBe("newest");
	});
});

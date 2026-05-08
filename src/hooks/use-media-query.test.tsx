import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./use-media-query";

interface FakeMQL {
	matches: boolean;
	addEventListener: (
		_type: "change",
		listener: (e: MediaQueryListEvent) => void,
	) => void;
	removeEventListener: (
		_type: "change",
		listener: (e: MediaQueryListEvent) => void,
	) => void;
}

function makeFakeMQL(initialMatches: boolean) {
	const listeners = new Set<(e: MediaQueryListEvent) => void>();
	const mql: FakeMQL = {
		matches: initialMatches,
		addEventListener: (_t, l) => listeners.add(l),
		removeEventListener: (_t, l) => listeners.delete(l),
	};
	const fire = (matches: boolean) => {
		mql.matches = matches;
		for (const l of listeners) {
			l({ matches } as MediaQueryListEvent);
		}
	};
	return { mql, fire, listenerCount: () => listeners.size };
}

describe("useMediaQuery", () => {
	const originalMatchMedia = window.matchMedia;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
	});

	it("returns the initial match value after mount", () => {
		const { mql } = makeFakeMQL(true);
		window.matchMedia = vi.fn().mockReturnValue(mql);

		const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

		expect(result.current).toBe(true);
	});

	it("updates when the media query change event fires", () => {
		const { mql, fire } = makeFakeMQL(false);
		window.matchMedia = vi.fn().mockReturnValue(mql);

		const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
		expect(result.current).toBe(false);

		act(() => fire(true));
		expect(result.current).toBe(true);

		act(() => fire(false));
		expect(result.current).toBe(false);
	});

	it("removes the listener on unmount", () => {
		const { mql, listenerCount } = makeFakeMQL(false);
		window.matchMedia = vi.fn().mockReturnValue(mql);

		const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
		expect(listenerCount()).toBe(1);

		unmount();
		expect(listenerCount()).toBe(0);
	});
});

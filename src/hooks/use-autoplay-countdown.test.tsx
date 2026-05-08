import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutoplayCountdown } from "./use-autoplay-countdown";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useAutoplayCountdown", () => {
	it("ticks the countdown every second and navigates at zero", () => {
		const onNavigate = vi.fn();
		const { result } = renderHook(() => useAutoplayCountdown({ onNavigate }));

		act(() => result.current.startCountdown());
		expect(result.current.showCountdown).toBe(true);
		expect(result.current.countdownValue).toBe(10);

		act(() => vi.advanceTimersByTime(1000));
		expect(result.current.countdownValue).toBe(9);

		act(() => vi.advanceTimersByTime(8000));
		expect(result.current.countdownValue).toBe(1);
		expect(onNavigate).not.toHaveBeenCalled();

		act(() => vi.advanceTimersByTime(1000));
		expect(result.current.countdownValue).toBe(0);
		expect(onNavigate).toHaveBeenCalledTimes(1);
	});

	it("cancelCountdown stops the timer and hides the UI", () => {
		const onNavigate = vi.fn();
		const { result } = renderHook(() => useAutoplayCountdown({ onNavigate }));

		act(() => result.current.startCountdown());
		act(() => vi.advanceTimersByTime(2000));
		expect(result.current.countdownValue).toBe(8);

		act(() => result.current.cancelCountdown());
		expect(result.current.showCountdown).toBe(false);

		// Even after the original 10s elapses, navigation must not fire.
		act(() => vi.advanceTimersByTime(15000));
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it("does not restart after cancellation (sticky cancel flag)", () => {
		const onNavigate = vi.fn();
		const { result } = renderHook(() => useAutoplayCountdown({ onNavigate }));

		act(() => result.current.cancelCountdown());
		act(() => result.current.startCountdown());
		// startCountdown is a no-op after cancel; UI should remain hidden.
		expect(result.current.showCountdown).toBe(false);

		act(() => vi.advanceTimersByTime(15000));
		expect(onNavigate).not.toHaveBeenCalled();
	});

	it("clears the timer on unmount", () => {
		const onNavigate = vi.fn();
		const { result, unmount } = renderHook(() =>
			useAutoplayCountdown({ onNavigate }),
		);

		act(() => result.current.startCountdown());
		unmount();
		act(() => vi.advanceTimersByTime(15000));
		expect(onNavigate).not.toHaveBeenCalled();
	});
});

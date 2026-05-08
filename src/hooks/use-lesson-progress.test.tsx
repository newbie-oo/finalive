import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLessonProgress } from "./use-lesson-progress";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const LESSON_ID = "11111111-1111-1111-1111-111111111111";

describe("useLessonProgress", () => {
	it("posts watched seconds and throttles calls within 10s", async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const { result } = renderHook(
			() => useLessonProgress({ lessonId: LESSON_ID }),
			{ wrapper },
		);

		act(() => result.current.saveProgress(12));
		// Second call within the throttle window must NOT POST.
		act(() => result.current.saveProgress(20));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		const [, init] = fetchMock.mock.calls[0]!;
		expect(JSON.parse(init.body)).toEqual({
			lessonId: LESSON_ID,
			watchedSeconds: 12,
		});
	});

	it("allows another save after the throttle window elapses", async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
		const { result } = renderHook(
			() => useLessonProgress({ lessonId: LESSON_ID }),
			{ wrapper },
		);

		act(() => result.current.saveProgress(10));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

		nowSpy.mockReturnValue(1_000_000 + 10_500);
		act(() => result.current.saveProgress(30));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

		nowSpy.mockRestore();
	});

	it("suppresses all writes when suppressProgress is true", () => {
		const { result } = renderHook(
			() =>
				useLessonProgress({ lessonId: LESSON_ID, suppressProgress: true }),
			{ wrapper },
		);

		act(() => result.current.saveProgress(99));
		act(() => result.current.markComplete());

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("markComplete dispatches lesson-completed event on success", async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const onCompleted = vi.fn();
		window.addEventListener("lesson-completed", onCompleted);

		const { result } = renderHook(
			() => useLessonProgress({ lessonId: LESSON_ID }),
			{ wrapper },
		);

		act(() => result.current.markComplete());

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
		expect(result.current.isCompleted).toBe(true);

		window.removeEventListener("lesson-completed", onCompleted);
	});

	it("markComplete is idempotent — second call does not refire", async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const { result } = renderHook(
			() => useLessonProgress({ lessonId: LESSON_ID }),
			{ wrapper },
		);

		act(() => result.current.markComplete());
		await waitFor(() => expect(result.current.isCompleted).toBe(true));
		act(() => result.current.markComplete());

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("rolls back isCompleted on server error", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 500 });
		const { result } = renderHook(
			() => useLessonProgress({ lessonId: LESSON_ID }),
			{ wrapper },
		);

		act(() => result.current.markComplete());

		await waitFor(() => expect(result.current.isCompleted).toBe(false));
	});
});

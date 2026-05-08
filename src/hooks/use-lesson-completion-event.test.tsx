import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLessonCompletionEvent } from "./use-lesson-completion-event";

describe("useLessonCompletionEvent", () => {
	it("invokes onCompleted only when the event matches lessonId", () => {
		const onCompleted = vi.fn();
		renderHook(() =>
			useLessonCompletionEvent({ lessonId: "lesson-1", onCompleted }),
		);

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: "lesson-1" },
				}),
			);
		});
		expect(onCompleted).toHaveBeenCalledTimes(1);

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: "lesson-2" },
				}),
			);
		});
		// Different lessonId — must not fire.
		expect(onCompleted).toHaveBeenCalledTimes(1);
	});

	it("removes the listener on unmount so stale callbacks do not fire", () => {
		const onCompleted = vi.fn();
		const { unmount } = renderHook(() =>
			useLessonCompletionEvent({ lessonId: "lesson-1", onCompleted }),
		);

		unmount();

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: "lesson-1" },
				}),
			);
		});
		expect(onCompleted).not.toHaveBeenCalled();
	});

	it("re-subscribes when lessonId changes", () => {
		const onCompleted = vi.fn();
		const { rerender } = renderHook(
			({ id }: { id: string }) =>
				useLessonCompletionEvent({ lessonId: id, onCompleted }),
			{ initialProps: { id: "lesson-1" } },
		);

		rerender({ id: "lesson-2" });

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: "lesson-2" },
				}),
			);
		});
		expect(onCompleted).toHaveBeenCalledTimes(1);

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: "lesson-1" },
				}),
			);
		});
		// lesson-1 listener was torn down — must not fire.
		expect(onCompleted).toHaveBeenCalledTimes(1);
	});
});

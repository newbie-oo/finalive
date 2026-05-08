import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCurriculumProgress } from "./use-curriculum-progress";

const modules = [
	{
		id: "m1",
		lessons: [
			{ id: "l1", durationSeconds: 600 },
			{ id: "l2", durationSeconds: 300 },
		],
	},
	{
		id: "m2",
		lessons: [
			{ id: "l3", durationSeconds: 1200 },
			{ id: "l4", durationSeconds: null },
		],
	},
];

describe("useCurriculumProgress", () => {
	it("counts only completed lessons", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress(modules, [
				{ lessonId: "l1", status: "completed" },
				{ lessonId: "l2", status: "in_progress" },
				{ lessonId: "l3", status: "completed" },
			]),
		);

		expect(result.current.doneCount).toBe(2);
		expect(result.current.lessonCount).toBe(4);
		expect(result.current.progressPct).toBe(50);
	});

	it("excludes completed lesson durations from remainingSeconds", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress(modules, [
				{ lessonId: "l1", status: "completed" },
			]),
		);

		// l2 (300) + l3 (1200) remain; l4 has null duration so contributes 0.
		expect(result.current.remainingSeconds).toBe(1500);
	});

	it("uses totalLessons override when provided", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress(
				modules,
				[{ lessonId: "l1", status: "completed" }],
				10, // explicit total — e.g. modules slice contains a subset
			),
		);

		expect(result.current.lessonCount).toBe(10);
		expect(result.current.progressPct).toBe(10);
	});

	it("returns 0% when there are no lessons", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress([], []),
		);

		expect(result.current.progressPct).toBe(0);
		expect(result.current.lessonCount).toBe(0);
	});

	it("layers optimistic completions on top of server progress", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress(modules, []),
		);

		expect(result.current.doneCount).toBe(0);

		act(() => {
			window.dispatchEvent(
				new CustomEvent("lesson-marked-complete", {
					detail: { lessonId: "l2" },
				}),
			);
		});

		expect(result.current.doneCount).toBe(1);
		expect(result.current.progressMap.get("l2")).toBe("completed");
	});

	it("ignores lesson-marked-complete events without a lessonId", () => {
		const { result } = renderHook(() =>
			useCurriculumProgress(modules, []),
		);

		act(() => {
			window.dispatchEvent(new CustomEvent("lesson-marked-complete", {}));
		});

		expect(result.current.doneCount).toBe(0);
	});
});

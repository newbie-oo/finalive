import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLessonAccess } from "./use-lesson-access";

const modules = [
	{
		id: "m1",
		lessons: [
			{ id: "l1", isPreview: false, isFree: false },
			{ id: "l2", isPreview: true, isFree: false },
		],
	},
	{
		id: "m2",
		lessons: [
			{ id: "l3", isPreview: false, isFree: false },
			{ id: "l4", isPreview: false, isFree: true },
		],
	},
	{
		id: "m3",
		lessons: [{ id: "l5", isPreview: false, isFree: false }],
	},
];

describe("useLessonAccess", () => {
	it("locks paid non-preview lessons for guests", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: false, isAdmin: false }),
		);

		expect(result.current.lessonLocked.get("l1")).toBe(true);
		expect(result.current.lessonLocked.get("l2")).toBe(false);
		expect(result.current.lessonLocked.get("l3")).toBe(true);
		expect(result.current.lessonLocked.get("l4")).toBe(false);
	});

	it("unlocks every lesson when the user is enrolled", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: true, isAdmin: false }),
		);

		for (const id of ["l1", "l2", "l3", "l4", "l5"]) {
			expect(result.current.lessonLocked.get(id)).toBe(false);
		}
	});

	it("unlocks every lesson when the user is admin (regardless of enrollment)", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: false, isAdmin: true }),
		);

		for (const id of ["l1", "l2", "l3", "l4", "l5"]) {
			expect(result.current.lessonLocked.get(id)).toBe(false);
		}
	});

	it("never locks the first module (preview entry path)", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: false, isAdmin: false }),
		);

		expect(result.current.moduleLocked.get("m1")).toBe(false);
	});

	it("locks subsequent modules with no preview/free lesson", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: false, isAdmin: false }),
		);

		// m2 has a free lesson → unlocked; m3 has none → locked.
		expect(result.current.moduleLocked.get("m2")).toBe(false);
		expect(result.current.moduleLocked.get("m3")).toBe(true);
	});

	it("unlocks modules entirely when isEnrolled", () => {
		const { result } = renderHook(() =>
			useLessonAccess({ modules, isEnrolled: true, isAdmin: false }),
		);

		expect(result.current.moduleLocked.get("m3")).toBe(false);
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LessonClient } from "./lesson-client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("LessonClient", () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as Response);
		global.fetch = fetchSpy as typeof global.fetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("calls /api/learn/start once on mount", async () => {
		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
			/>,
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(fetchSpy).toHaveBeenCalledWith(
			"/api/learn/start",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ lessonId: "l1" }),
			}),
		);
	});

	it("does NOT poll /api/learn/progress automatically", async () => {
		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
			/>,
		);

		await act(async () => {
			await Promise.resolve();
		});

		// Only /api/learn/start should have been called
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledWith(
			"/api/learn/start",
			expect.any(Object),
		);
	});

	it("calls /api/learn/progress with markComplete when button is clicked", async () => {
		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
			/>,
		);

		const btn = screen.getByRole("button", {
			name: "ทำเครื่องหมายว่าจบแล้ว",
		});

		await act(async () => {
			fireEvent.click(btn);
			await Promise.resolve();
		});

		expect(fetchSpy).toHaveBeenCalledWith(
			"/api/learn/progress",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					lessonId: "l1",
					watchedSeconds: 120,
					markComplete: true,
				}),
			}),
		);
	});

	it("changes button text to 'จบบทเรียนแล้ว' after click", async () => {
		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
			/>,
		);

		const btn = screen.getByRole("button", {
			name: "ทำเครื่องหมายว่าจบแล้ว",
		});

		await act(async () => {
			fireEvent.click(btn);
			await Promise.resolve();
		});

		expect(
			screen.getByRole("button", { name: /จบบทเรียนแล้ว/ }),
		).toBeInTheDocument();
	});

	it("skips all network calls when isAdmin is true", async () => {
		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
				isAdmin
			/>,
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("shows admin toast when admin clicks complete", async () => {
		const { toast } = await import("sonner");

		render(
			<LessonClient
				lessonId="l1"
				courseSlug="cs1"
				nextLessonId={null}
				durationSeconds={120}
				isAdmin
			/>,
		);

		const btn = screen.getByRole("button", {
			name: "ทำเครื่องหมายว่าจบแล้ว",
		});

		await act(async () => {
			fireEvent.click(btn);
			await Promise.resolve();
		});

		expect(toast.info).toHaveBeenCalledWith("admin preview — ไม่บันทึกความคืบหน้า");
	});
});

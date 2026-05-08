import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LessonPlayerLayout } from "./lesson-player-layout";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("./lesson-client", () => ({
	LessonClient: () => null,
}));

vi.mock("./notes-panel", () => ({
	NotesPanel: () => null,
}));

vi.mock("./certificate-claim", () => ({
	CertificateClaim: () => null,
}));

vi.mock("@/lib/markdown", () => ({
	MarkdownView: () => null,
}));

const baseProps = {
	lessonId: "l1",
	lessonTitle: "บทเรียนที่ 1",
	moduleTitle: "โมดูล 1",
	lessonBodyMd: null,
	durationSeconds: 600,
	totalLessons: 10,
	doneLessons: 2,
	courseSlug: "course",
	nextLessonId: "l2",
	prevLessonId: null,
	quizId: null,
	playerSlot: <div data-testid="player">player</div>,
};

interface LayoutOverrides {
	durationSeconds?: number | null;
	watchedSeconds?: number;
	isAdmin?: boolean;
	isCompleted?: boolean;
}

function renderLayout(overrides: LayoutOverrides = {}) {
	return render(
		<TooltipProvider>
			<LessonPlayerLayout {...baseProps} {...overrides} />
		</TooltipProvider>,
	);
}

describe("LessonPlayerLayout", () => {
	it("does not render a bookmark button (the persisted bookmark feature is not built yet)", () => {
		renderLayout();
		expect(screen.queryByRole("button", { name: /บุ๊กมาร์ก/i })).toBeNull();
		expect(screen.queryByRole("button", { name: /Bookmark/i })).toBeNull();
	});

	it("disables the mark-complete button until the student has watched at least 80% of the lesson", () => {
		renderLayout({ watchedSeconds: 100, durationSeconds: 600 });
		const button = screen.getByRole("button", {
			name: /ทำเครื่องหมายว่าจบ/,
		});
		expect(button).toBeDisabled();
	});

	it("enables the mark-complete button once the student crosses the 80% threshold", () => {
		renderLayout({ watchedSeconds: 540, durationSeconds: 600 });
		const button = screen.getByRole("button", {
			name: /ทำเครื่องหมายว่าจบ/,
		});
		expect(button).not.toBeDisabled();
	});

	it("never gates admins — they can mark complete from the start for QA", () => {
		renderLayout({ watchedSeconds: 0, durationSeconds: 600, isAdmin: true });
		const button = screen.getByRole("button", {
			name: /ทำเครื่องหมายว่าจบ/,
		});
		expect(button).not.toBeDisabled();
	});

	it("treats lessons without a known duration as ungated", () => {
		renderLayout({ watchedSeconds: 0, durationSeconds: null });
		const button = screen.getByRole("button", {
			name: /ทำเครื่องหมายว่าจบ/,
		});
		expect(button).not.toBeDisabled();
	});

	it("shows the completed state when isCompleted is true", () => {
		renderLayout({ isCompleted: true });
		expect(
			screen.getByRole("button", { name: /จบบทเรียนแล้ว/ }),
		).toBeDisabled();
	});
});

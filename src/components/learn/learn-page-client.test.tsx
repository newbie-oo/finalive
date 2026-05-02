import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearnPageClient } from "./learn-page-client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock vidstack-player
vi.mock("@/components/course/vidstack-player", () => ({
	VidstackPlayer: ({ onVideoEnded }: { onVideoEnded?: () => void }) => (
		<div data-testid="vidstack-player">
			<button onClick={onVideoEnded}>simulate-ended</button>
		</div>
	),
}));

// Mock auth-client for NotesPanel
vi.mock("@/lib/auth-client", () => ({
	useSession: () => ({ data: { user: { id: "u1" } } }),
}));

// Mock child components
vi.mock("./curriculum-sidebar", () => ({
	CurriculumSidebar: () => <div data-testid="curriculum-sidebar" />,
}));

vi.mock("./learn-topbar", () => ({
	LearnTopbar: () => <div data-testid="learn-topbar" />,
}));

vi.mock("./mobile-curriculum-drawer", () => ({
	MobileCurriculumDrawer: () => <div data-testid="mobile-drawer" />,
}));

vi.mock("./lesson-client", () => ({
	LessonClient: () => <div data-testid="lesson-client" />,
}));

vi.mock("./course-complete-modal", () => ({
	CourseCompleteModal: () => <div data-testid="course-complete-modal" />,
}));

vi.mock("@/lib/markdown", () => ({
	MarkdownView: ({ text }: { text: string }) => <div>{text}</div>,
}));

const defaultProps = {
	courseSlug: "cs1",
	courseTitle: "Test Course",
	lessonId: "l1",
	lessonTitle: "Lesson 1",
	moduleTitle: "Module 1",
	lessonBodyMd: "# Hello",
	bunnyVideoId: "vid1",
	durationSeconds: 120,
	nextLessonId: "l2",
	prevLessonId: null,
	quizId: null,
	modules: [],
	progress: [],
	passedQuizIds: {},
	isEnrolled: true,
	isAdmin: false,
	totalLessons: 5,
	doneLessons: 1,
	watchedSeconds: 0,
	hlsUrl: "https://example.com/video.m3u8",
};

describe("LearnPageClient", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("switches between content and notes tabs", () => {
		render(<LearnPageClient {...defaultProps} />);

		const contentTab = screen.getByRole("tab", { name: "เนื้อหา" });
		const notesTab = screen.getByRole("tab", { name: "โน้ต" });

		expect(contentTab).toHaveAttribute("aria-selected", "true");
		expect(notesTab).toHaveAttribute("aria-selected", "false");

		fireEvent.click(notesTab);

		expect(contentTab).toHaveAttribute("aria-selected", "false");
		expect(notesTab).toHaveAttribute("aria-selected", "true");
		expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
	});

	it("shows countdown overlay after video ends when nextLesson exists and no quiz", async () => {
		render(<LearnPageClient {...defaultProps} quizId={null} />);

		const endBtn = screen.getByRole("button", { name: "simulate-ended" });
		fireEvent.click(endBtn);

		expect(screen.getByTestId("autoplay-countdown")).toBeInTheDocument();
		expect(screen.getByText(/บทถัดไปใน/)).toBeInTheDocument();
	});

	it("does NOT show countdown when quiz exists", () => {
		render(<LearnPageClient {...defaultProps} quizId="q1" />);

		const endBtn = screen.getByRole("button", { name: "simulate-ended" });
		fireEvent.click(endBtn);

		expect(screen.queryByTestId("autoplay-countdown")).not.toBeInTheDocument();
	});

	it("cancel stops countdown", () => {
		render(<LearnPageClient {...defaultProps} />);

		const endBtn = screen.getByRole("button", { name: "simulate-ended" });
		fireEvent.click(endBtn);

		expect(screen.getByTestId("autoplay-countdown")).toBeInTheDocument();

		const cancelBtn = screen.getByRole("button", { name: /ยกเลิก/ });
		fireEvent.click(cancelBtn);

		expect(screen.queryByTestId("autoplay-countdown")).not.toBeInTheDocument();
	});

	it("adds aria-current to active tab", () => {
		render(<LearnPageClient {...defaultProps} />);

		const contentTab = screen.getByRole("tab", { name: "เนื้อหา" });
		expect(contentTab).toHaveAttribute("aria-current", "page");

		const notesTab = screen.getByRole("tab", { name: "โน้ต" });
		expect(notesTab).not.toHaveAttribute("aria-current");

		fireEvent.click(notesTab);

		expect(notesTab).toHaveAttribute("aria-current", "page");
		expect(contentTab).not.toHaveAttribute("aria-current");
	});
});

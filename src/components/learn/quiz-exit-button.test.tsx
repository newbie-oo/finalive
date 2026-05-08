import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizExitButton } from "./quiz-exit-button";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

describe("QuizExitButton", () => {
	it("opens an alert dialog when the exit trigger is clicked", () => {
		render(<QuizExitButton lessonHref="/learn/c/lesson" />);

		fireEvent.click(screen.getByRole("button", { name: /ออกจากแบบทดสอบ/ }));

		expect(
			screen.getByRole("alertdialog", { name: /ออกจากแบบทดสอบ/ }),
		).toBeInTheDocument();
		// The dialog warns that progress won't be saved.
		expect(
			screen.getByText(/คะแนนที่ยังไม่ได้ส่งจะหายไป/),
		).toBeInTheDocument();
	});

	it("does not navigate when the user cancels", () => {
		pushMock.mockClear();
		render(<QuizExitButton lessonHref="/learn/c/lesson" />);

		fireEvent.click(screen.getByRole("button", { name: /ออกจากแบบทดสอบ/ }));
		fireEvent.click(screen.getByRole("button", { name: /ทำต่อ/ }));

		expect(pushMock).not.toHaveBeenCalled();
	});

	it("navigates to the lesson when the destructive confirm is clicked", () => {
		pushMock.mockClear();
		render(<QuizExitButton lessonHref="/learn/c/lesson" />);

		fireEvent.click(screen.getByRole("button", { name: /ออกจากแบบทดสอบ/ }));
		fireEvent.click(screen.getByRole("button", { name: /ออกเลย/ }));

		expect(pushMock).toHaveBeenCalledWith("/learn/c/lesson");
	});
});

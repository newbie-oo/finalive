import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizBriefing } from "./quiz-briefing";

describe("QuizBriefing", () => {
	it("renders quiz stats and the start CTA", () => {
		render(
			<QuizBriefing
				title="ทดสอบบทที่ 1"
				questionCount={10}
				passScorePct={60}
				lessonHref="/learn/x/y"
				onStart={() => {}}
			/>,
		);
		expect(screen.getByText("ทดสอบบทที่ 1")).toBeInTheDocument();
		expect(screen.getAllByText("10").length).toBeGreaterThan(0);
		expect(screen.getByText("60")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "เริ่มทำแบบทดสอบ" }),
		).toBeInTheDocument();
	});

	it("calls onStart when the primary CTA is clicked", () => {
		const onStart = vi.fn();
		render(
			<QuizBriefing
				title="ทดสอบ"
				questionCount={5}
				passScorePct={80}
				lessonHref="/learn/x/y"
				onStart={onStart}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "เริ่มทำแบบทดสอบ" }));
		expect(onStart).toHaveBeenCalledOnce();
	});

	it("links 'กลับไปบทเรียน' to the supplied lesson href", () => {
		render(
			<QuizBriefing
				title="ทดสอบ"
				questionCount={5}
				passScorePct={80}
				lessonHref="/learn/course-a/lesson-1"
				onStart={() => {}}
			/>,
		);
		expect(
			screen.getByRole("link", { name: /กลับไปบทเรียน/ }),
		).toHaveAttribute("href", "/learn/course-a/lesson-1");
	});
});

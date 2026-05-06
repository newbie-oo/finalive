import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseTabs } from "./course-tabs";
import type { CurriculumModule } from "@/server/repos/curriculum-repo";

function makeCurriculum(): CurriculumModule[] {
	return [
		{
			id: "m1",
			title: "Module 1",
			sortOrder: 1,
			lessons: [
				{
					id: "l1",
					title: "Lesson 1",
					durationSeconds: 120,
					isPreview: true,
					isFree: false,
					sortOrder: 1,
				},
			],
		},
	];
}

describe("CourseTabs", () => {
	it("renders learning outcomes by default", () => {
		render(
			<CourseTabs
				curriculum={makeCurriculum()}
				courseSlug="test-course"
				totalLessons={1}
				totalDuration={120}
			/>,
		);
		expect(screen.getByText("สิ่งที่คุณจะได้เรียนรู้")).toBeInTheDocument();
		expect(
			screen.getByText("เข้าใจหลักการลงทุนแบบ Value Investing จากศูนย์"),
		).toBeInTheDocument();
	});

	it("switches to instructor tab on click", () => {
		render(
			<CourseTabs
				curriculum={makeCurriculum()}
				courseSlug="test-course"
				totalLessons={1}
				totalDuration={120}
			/>,
		);

		const instructorTab = screen.getByRole("tab", { name: "ผู้สอน" });
		fireEvent.click(instructorTab);

		expect(screen.getByText("Arm Riley Quant")).toBeInTheDocument();
		expect(
			screen.getByText("นักวิเคราะห์การลงทุน · CFA Charterholder"),
		).toBeInTheDocument();
	});

	it("switches to FAQ tab and accordion opens/closes", () => {
		render(
			<CourseTabs
				curriculum={makeCurriculum()}
				courseSlug="test-course"
				totalLessons={1}
				totalDuration={120}
			/>,
		);

		const faqTab = screen.getByRole("tab", { name: "FAQ" });
		fireEvent.click(faqTab);

		const faqQuestion = screen.getByRole("button", {
			name: "คอร์สนี้เหมาะกับใคร?",
		});
		expect(faqQuestion).toBeInTheDocument();

		// Initially closed
		expect(faqQuestion).toHaveAttribute("aria-expanded", "false");

		// Open
		fireEvent.click(faqQuestion);
		expect(faqQuestion).toHaveAttribute("aria-expanded", "true");
		expect(
			screen.getByText(
				"เหมาะสำหรับผู้เริ่มต้นลงทุน หรือผู้ที่ต้องการสร้างรากฐานการวิเคราะห์หุ้นอย่างเป็นระบบ ไม่จำเป็นต้องมีประสบการณ์มาก่อน",
			),
		).toBeInTheDocument();

		// Close
		fireEvent.click(faqQuestion);
		expect(faqQuestion).toHaveAttribute("aria-expanded", "false");
	});

	it("shows curriculum tab with lesson list by default", () => {
		render(
			<CourseTabs
				curriculum={makeCurriculum()}
				courseSlug="test-course"
				totalLessons={1}
				totalDuration={120}
			/>,
		);

		expect(screen.getByText(/Module 1/)).toBeInTheDocument();
		expect(screen.getByText("Lesson 1")).toBeInTheDocument();
	});
});

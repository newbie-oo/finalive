import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCard } from "./course-card";
import type { PublicCourseSummary } from "@/server/repos/course";

function makeCourse(
	overrides: Partial<PublicCourseSummary> = {},
): PublicCourseSummary {
	return {
		id: "c1",
		slug: "test-course",
		title: "Test Course",
		summary: "A test course",
		coverUrl: "https://example.com/cover.jpg",
		price: "990",
		isFree: false,
		status: "published",
		enrollmentCount: 42,
		publishedAt: null,
		...overrides,
	};
}

describe("CourseCard", () => {
	it("renders free badge when course is free", () => {
		render(<CourseCard course={makeCourse({ isFree: true, price: "0" })} />);
		const badge = document.querySelector('[data-slot="status-chip"]');
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveTextContent("ฟรี");
	});

	it("renders free badge when price is 0 even if isFree is false", () => {
		render(<CourseCard course={makeCourse({ isFree: false, price: "0" })} />);
		const badge = document.querySelector('[data-slot="status-chip"]');
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveTextContent("ฟรี");
	});

	it("does not render free badge for paid course", () => {
		render(<CourseCard course={makeCourse({ isFree: false, price: "990" })} />);
		expect(
			document.querySelector('[data-slot="status-chip"]'),
		).not.toBeInTheDocument();
	});

	it("renders fallback cover when no coverUrl", () => {
		render(
			<CourseCard
				course={makeCourse({ coverUrl: null, title: "React Mastery" })}
			/>,
		);
		// Fallback shows the first letter of the title
		expect(screen.getByText("R")).toBeInTheDocument();
	});

	it("renders cover image when coverUrl is provided", () => {
		render(
			<CourseCard
				course={makeCourse({ coverUrl: "https://example.com/cover.jpg" })}
			/>,
		);
		const img = screen.getByAltText("Test Course");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", expect.stringContaining("cover.jpg"));
	});

	it("renders enrollment count", () => {
		render(<CourseCard course={makeCourse({ enrollmentCount: 1234 })} />);
		expect(screen.getByText("1,234")).toBeInTheDocument();
	});

	it("links to course detail page", () => {
		render(<CourseCard course={makeCourse({ slug: "my-course" })} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/courses/my-course");
	});
});

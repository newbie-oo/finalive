import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseHeroPoster } from "./course-hero-poster";

vi.mock("next/image", () => ({
	default: ({ alt, ...props }: { alt: string } & Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img alt={alt} {...(props as object)} />
	),
}));

describe("CourseHeroPoster", () => {
	it("renders the cover image when coverImageUrl is provided", () => {
		render(
			<CourseHeroPoster
				title="DCF Valuation"
				coverImageUrl="https://cdn.example.com/cover.jpg"
				previewHref={null}
			/>,
		);
		expect(screen.getByRole("img", { name: /DCF Valuation/ })).toBeInTheDocument();
	});

	it("falls back to a gradient panel with the first letter when there is no cover image", () => {
		render(
			<CourseHeroPoster
				title="DCF Valuation"
				coverImageUrl={null}
				previewHref={null}
			/>,
		);
		// First letter rendered prominently in the fallback.
		expect(screen.getByText("D")).toBeInTheDocument();
	});

	it("wraps the poster in a link to the preview lesson when previewHref is provided", () => {
		render(
			<CourseHeroPoster
				title="DCF Valuation"
				coverImageUrl="https://cdn.example.com/cover.jpg"
				previewHref="/courses/dcf/preview/lesson-1"
			/>,
		);
		const link = screen.getByRole("link", { name: /ดูตัวอย่าง/ });
		expect(link).toHaveAttribute("href", "/courses/dcf/preview/lesson-1");
	});

	it("renders no play overlay when there is no previewable lesson", () => {
		render(
			<CourseHeroPoster
				title="DCF Valuation"
				coverImageUrl="https://cdn.example.com/cover.jpg"
				previewHref={null}
			/>,
		);
		expect(screen.queryByRole("link", { name: /ดูตัวอย่าง/ })).toBeNull();
	});
});

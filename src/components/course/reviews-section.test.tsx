import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseReviewsSection, type Review } from "./reviews-section";

const SAMPLE: ReadonlyArray<Review> = [
	{
		name: "ก.",
		role: "Analyst",
		rating: 5,
		body: "ดีมาก",
		date: new Date("2024-08-12"),
	},
	{
		name: "ข.",
		role: "PM",
		rating: 4,
		body: "ใช้งานได้จริง",
		date: new Date("2024-09-12"),
	},
	{
		name: "ค.",
		role: "นักศึกษา",
		rating: 5,
		body: "เข้าใจง่าย",
		date: new Date("2024-10-12"),
	},
];

describe("CourseReviewsSection", () => {
	it("returns null when no reviews are provided so the section never shows an empty header", () => {
		const { container } = render(<CourseReviewsSection reviews={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the aggregate rating, total review count, and a card per review", () => {
		render(<CourseReviewsSection reviews={SAMPLE} />);
		// Average is (5+4+5)/3 = 4.67 → rendered as 4.7
		expect(screen.getByText(/4\.7/)).toBeInTheDocument();
		expect(screen.getByText("จาก 3 รีวิว")).toBeInTheDocument();
		// 3 review cards + 5 distribution buckets, all <li>.
		expect(screen.getAllByRole("listitem")).toHaveLength(8);
	});

	it("renders a 1–5 distribution row with one bar per rating bucket", () => {
		const { container } = render(<CourseReviewsSection reviews={SAMPLE} />);
		expect(
			container.querySelectorAll('[data-testid="rating-bucket"]'),
		).toHaveLength(5);
	});

	it("emits one filled star per rating point on each review card", () => {
		const { container } = render(<CourseReviewsSection reviews={SAMPLE} />);
		const totalStars = SAMPLE.reduce((sum, r) => sum + r.rating, 0);
		expect(
			container.querySelectorAll('[data-testid="review-star"]'),
		).toHaveLength(totalStars);
	});
});

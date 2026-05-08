import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialsSection } from "./testimonials-section";
import { TESTIMONIALS } from "./data";

describe("TestimonialsSection", () => {
	it("renders a heading that signals social proof", () => {
		render(<TestimonialsSection />);
		expect(
			screen.getByRole("heading", { level: 2 }),
		).toHaveTextContent(/นักเรียน|รีวิว|เสียงจาก/);
	});

	it("renders one card per testimonial with quote + name + role", () => {
		render(<TestimonialsSection />);
		for (const t of TESTIMONIALS) {
			expect(screen.getByText(t.quote)).toBeInTheDocument();
			expect(screen.getByText(t.name)).toBeInTheDocument();
			expect(screen.getByText(t.role)).toBeInTheDocument();
		}
	});

	it("exposes one star image per filled point on each testimonial", () => {
		const { container } = render(<TestimonialsSection />);
		const totalStars = TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0);
		expect(
			container.querySelectorAll('[data-testid="testimonial-star"]'),
		).toHaveLength(totalStars);
	});
});

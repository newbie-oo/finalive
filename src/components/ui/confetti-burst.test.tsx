import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfettiBurst } from "./confetti-burst";

describe("ConfettiBurst", () => {
	it("is hidden from assistive tech", () => {
		render(<ConfettiBurst pieces={6} />);
		const root = screen.getByTestId("confetti-burst");
		expect(root).toHaveAttribute("aria-hidden", "true");
	});

	it("renders the requested number of pieces", () => {
		render(<ConfettiBurst pieces={5} />);
		const root = screen.getByTestId("confetti-burst");
		expect(root.querySelectorAll(".confetti-piece")).toHaveLength(5);
	});

	it("clamps unreasonable piece counts", () => {
		render(<ConfettiBurst pieces={500} />);
		const root = screen.getByTestId("confetti-burst");
		expect(root.querySelectorAll(".confetti-piece").length).toBeLessThanOrEqual(60);
	});
});

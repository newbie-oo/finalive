import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LearningOutcomesSection } from "./learning-outcomes-section";

describe("LearningOutcomesSection", () => {
	it("returns null when no outcomes are provided so the page does not show an empty heading", () => {
		const { container } = render(<LearningOutcomesSection outcomes={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the heading and one bullet per outcome", () => {
		render(
			<LearningOutcomesSection
				outcomes={["อ่านงบการเงิน", "วางพอร์ตลงทุน", "ประเมินมูลค่าหุ้น"]}
			/>,
		);
		expect(
			screen.getByRole("heading", { level: 2, name: /สิ่งที่คุณจะได้เรียน/ }),
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});

	it("renders a check icon next to each bullet for visual reinforcement", () => {
		const { container } = render(
			<LearningOutcomesSection outcomes={["อ่านงบการเงิน"]} />,
		);
		expect(
			container.querySelectorAll('[data-testid="outcome-check"]'),
		).toHaveLength(1);
	});
});

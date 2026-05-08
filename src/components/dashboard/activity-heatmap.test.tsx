import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityHeatmap } from "./activity-heatmap";

const ZEROS = Array.from({ length: 35 }, () => 0) as readonly number[];

describe("ActivityHeatmap", () => {
	it("renders one cell per day in the rolling 5-week window", () => {
		const { container } = render(
			<ActivityHeatmap heatmap={ZEROS} weeklyWatchedSeconds={0} />,
		);
		expect(
			container.querySelectorAll('[data-testid="heatmap-cell"]'),
		).toHaveLength(35);
	});

	it("labels every cell with an intensity level so screen readers can interpret it", () => {
		const { container } = render(
			<ActivityHeatmap heatmap={ZEROS} weeklyWatchedSeconds={0} />,
		);
		const cells = container.querySelectorAll('[data-testid="heatmap-cell"]');
		for (const cell of cells) {
			expect(cell.getAttribute("aria-label")).toMatch(/ระดับ/);
		}
	});

	it("exposes the heatmap as a labelled landscape region for screen readers", () => {
		render(<ActivityHeatmap heatmap={ZEROS} weeklyWatchedSeconds={0} />);
		const region = screen.getByRole("img", {
			name: /ความคืบหน้า 5 สัปดาห์/,
		});
		expect(region).toBeInTheDocument();
	});

	it("shows weekly hours rounded to one decimal", () => {
		render(
			<ActivityHeatmap heatmap={ZEROS} weeklyWatchedSeconds={3600 * 7.25} />,
		);
		expect(screen.getByText(/7\.3/)).toBeInTheDocument();
	});
});

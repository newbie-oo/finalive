import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityHeatmap } from "./activity-heatmap";

const ZEROS = Array.from({ length: 35 }, () => 0) as readonly number[];

describe("ActivityHeatmap", () => {
	it("renders one cell per day in the rolling 5-week window", () => {
		const { container } = render(<ActivityHeatmap heatmap={ZEROS} />);
		expect(
			container.querySelectorAll('[data-testid="heatmap-cell"]'),
		).toHaveLength(35);
	});

	it("labels every cell with an intensity level so screen readers can interpret it", () => {
		const { container } = render(<ActivityHeatmap heatmap={ZEROS} />);
		const cells = container.querySelectorAll('[data-testid="heatmap-cell"]');
		for (const cell of cells) {
			expect(cell.getAttribute("aria-label")).toMatch(/ระดับ/);
		}
	});

	it("exposes the heatmap as a labelled landscape region for screen readers", () => {
		render(<ActivityHeatmap heatmap={ZEROS} />);
		const region = screen.getByRole("img", {
			name: /ความคืบหน้า 5 สัปดาห์/,
		});
		expect(region).toBeInTheDocument();
	});

	it("counts active days from the heatmap data", () => {
		const sample = [...ZEROS];
		sample[34] = 2;
		sample[33] = 1;
		render(<ActivityHeatmap heatmap={sample} />);
		const weekly = screen.getByText("สัปดาห์นี้").nextElementSibling;
		const total = screen.getByText("ใน 5 สัปดาห์").nextElementSibling;
		expect(weekly?.textContent).toMatch(/2.*7 วัน/);
		expect(total?.textContent).toMatch(/2.*35 วัน/);
	});
});

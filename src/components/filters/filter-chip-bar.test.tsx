import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterChipBar } from "./filter-chip-bar";

describe("FilterChipBar", () => {
	it("renders nothing when filter list is empty", () => {
		const { container } = render(
			<FilterChipBar
				filters={[]}
				onRemove={() => {}}
				onClearAll={() => {}}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders one chip per active filter", () => {
		render(
			<FilterChipBar
				filters={[
					{ key: "q", label: "ค้นหา: react" },
					{ key: "price", label: "ฟรี" },
				]}
				onRemove={() => {}}
				onClearAll={() => {}}
			/>,
		);
		expect(screen.getByText("ค้นหา: react")).toBeInTheDocument();
		expect(screen.getByText("ฟรี")).toBeInTheDocument();
	});

	it("calls onRemove with the chip key when clicked", () => {
		const onRemove = vi.fn();
		render(
			<FilterChipBar
				filters={[{ key: "price", label: "ฟรี" }]}
				onRemove={onRemove}
				onClearAll={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /ลบตัวกรอง.*ฟรี/ }));
		expect(onRemove).toHaveBeenCalledWith("price");
	});

	it("shows 'ล้างทั้งหมด' only when 2+ filters are active", () => {
		const { rerender } = render(
			<FilterChipBar
				filters={[{ key: "q", label: "ค้นหา: x" }]}
				onRemove={() => {}}
				onClearAll={() => {}}
			/>,
		);
		expect(screen.queryByRole("button", { name: "ล้างทั้งหมด" })).toBeNull();

		rerender(
			<FilterChipBar
				filters={[
					{ key: "q", label: "ค้นหา: x" },
					{ key: "price", label: "ฟรี" },
				]}
				onRemove={() => {}}
				onClearAll={() => {}}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "ล้างทั้งหมด" }),
		).toBeInTheDocument();
	});

	it("invokes onClearAll when 'ล้างทั้งหมด' is clicked", () => {
		const onClearAll = vi.fn();
		render(
			<FilterChipBar
				filters={[
					{ key: "q", label: "ค้นหา: x" },
					{ key: "price", label: "ฟรี" },
				]}
				onRemove={() => {}}
				onClearAll={onClearAll}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "ล้างทั้งหมด" }));
		expect(onClearAll).toHaveBeenCalledOnce();
	});
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Kbd, KbdShortcut } from "./kbd";

describe("Kbd", () => {
	it("renders a single key inside a kbd element with mono styling", () => {
		const { container } = render(<Kbd>A</Kbd>);
		const el = container.querySelector("kbd");
		expect(el).toBeInTheDocument();
		expect(el).toHaveTextContent("A");
		expect(el).toHaveClass("mono");
	});
});

describe("KbdShortcut", () => {
	it("renders one Kbd per key without separators when no separator is set", () => {
		const { container } = render(<KbdShortcut keys={["A"]} />);
		expect(container.querySelectorAll("kbd")).toHaveLength(1);
	});

	it("joins multi-key combos with the configured separator", () => {
		render(<KbdShortcut keys={["Ctrl", "K"]} />);
		expect(screen.getByText("+")).toBeInTheDocument();
	});

	it("respects a custom separator string", () => {
		render(<KbdShortcut keys={["⌘", "K"]} separator="·" />);
		expect(screen.getByText("·")).toBeInTheDocument();
	});

	it("renders nothing when given an empty key list", () => {
		const { container } = render(<KbdShortcut keys={[]} />);
		expect(container.firstChild).toBeNull();
	});
});

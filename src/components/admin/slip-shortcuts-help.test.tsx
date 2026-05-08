import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlipShortcutsHelp } from "./slip-shortcuts-help";

describe("SlipShortcutsHelp", () => {
	it("opens a dialog listing every keyboard shortcut when the trigger is clicked", () => {
		render(<SlipShortcutsHelp />);
		fireEvent.click(screen.getByRole("button", { name: /คีย์ลัด/ }));

		const dialog = screen.getByRole("dialog");
		// Every documented shortcut and its action must appear.
		expect(dialog).toHaveTextContent(/A/);
		expect(dialog).toHaveTextContent(/ยอมรับ/);
		expect(dialog).toHaveTextContent(/R/);
		expect(dialog).toHaveTextContent(/ปฏิเสธ/);
		expect(dialog).toHaveTextContent(/S/);
		expect(dialog).toHaveTextContent(/ข้าม/);
		expect(dialog).toHaveTextContent(/J/);
		expect(dialog).toHaveTextContent(/K/);
		expect(dialog).toHaveTextContent(/Esc/);
	});

	it("renders each shortcut key inside a kbd element", () => {
		render(<SlipShortcutsHelp />);
		fireEvent.click(screen.getByRole("button", { name: /คีย์ลัด/ }));

		const dialog = screen.getByRole("dialog");
		expect(dialog.querySelectorAll("kbd").length).toBeGreaterThanOrEqual(7);
	});
});

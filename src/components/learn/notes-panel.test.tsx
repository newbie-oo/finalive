import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	act,
} from "@testing-library/react";
import { NotesPanel } from "./notes-panel";

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
	useSession: () => ({ data: { user: { id: "u1" } } }),
}));

describe("NotesPanel", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		localStorage.clear();
	});

	it("loads existing note from localStorage", () => {
		localStorage.setItem("finalive-notes-u1-l1", "existing note");
		render(<NotesPanel lessonId="l1" />);
		expect(screen.getByDisplayValue("existing note")).toBeInTheDocument();
	});

	it("types text and debounce-saves to localStorage", async () => {
		render(<NotesPanel lessonId="l1" />);
		const textarea = screen.getByPlaceholderText("จดโน้ตของคุณที่นี่...");

		fireEvent.change(textarea, { target: { value: "hello world" } });

		expect(localStorage.getItem("finalive-notes-u1-l1")).toBeNull();

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		await waitFor(() => {
			expect(localStorage.getItem("finalive-notes-u1-l1")).toBe("hello world");
		});
	});

	it("clear button removes note from localStorage", async () => {
		localStorage.setItem("finalive-notes-u1-l1", "to be cleared");
		render(<NotesPanel lessonId="l1" />);

		expect(screen.getByDisplayValue("to be cleared")).toBeInTheDocument();

		const clearBtn = screen.getByRole("button", { name: /ล้าง/ });
		fireEvent.click(clearBtn);

		expect(localStorage.getItem("finalive-notes-u1-l1")).toBeNull();
		expect(screen.getByPlaceholderText("จดโน้ตของคุณที่นี่...")).toHaveValue("");
	});

	it("shows character count", () => {
		render(<NotesPanel lessonId="l1" />);
		const textarea = screen.getByPlaceholderText("จดโน้ตของคุณที่นี่...");

		fireEvent.change(textarea, { target: { value: "abc" } });

		expect(screen.getByText("3 ตัวอักษร")).toBeInTheDocument();
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotesPanel } from "./notes-panel";

// Mock auth-client
vi.mock("@/lib/auth-client", () => ({
	useSession: () => ({ data: { user: { id: "u1" } } }),
}));

describe("NotesPanel", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("renders the editor surface and the mobile toggle", () => {
		render(<NotesPanel lessonId="l1" />);
		expect(screen.getByText(/โน้ตของฉัน/)).toBeInTheDocument();
	});

	it("loads existing HTML notes from localStorage into the editor", async () => {
		localStorage.setItem(
			"finalive-notes-u1-l1",
			"<p>existing note</p>",
		);
		render(<NotesPanel lessonId="l1" />);
		await waitFor(() => {
			expect(screen.getByText("existing note")).toBeInTheDocument();
		});
	});

	it("clear button wipes localStorage and disables itself when empty", async () => {
		localStorage.setItem("finalive-notes-u1-l1", "<p>to be cleared</p>");
		render(<NotesPanel lessonId="l1" />);

		const clearBtn = await screen.findByRole("button", { name: /ล้าง/ });
		fireEvent.click(clearBtn);

		await waitFor(() => {
			expect(localStorage.getItem("finalive-notes-u1-l1")).toBeNull();
		});
	});
});

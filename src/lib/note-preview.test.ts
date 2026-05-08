/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getNotePreview } from "./note-preview";

beforeEach(() => {
	localStorage.clear();
});

describe("getNotePreview", () => {
	it("returns the stored note verbatim when shorter than 80 chars", () => {
		localStorage.setItem("finalive-notes-u1-l1", "short note");
		expect(getNotePreview("u1", "l1")).toBe("short note");
	});

	it("truncates and adds ellipsis when longer than 80 chars", () => {
		const long = "x".repeat(120);
		localStorage.setItem("finalive-notes-u1-l1", long);
		const out = getNotePreview("u1", "l1");
		expect(out).toHaveLength(81); // 80 chars + ellipsis
		expect(out.endsWith("…")).toBe(true);
	});

	it("returns empty string when no note exists", () => {
		expect(getNotePreview("u1", "missing")).toBe("");
	});

	it("returns empty string when userId or lessonId is empty", () => {
		expect(getNotePreview("", "l1")).toBe("");
		expect(getNotePreview("u1", "")).toBe("");
	});

	it("scopes by userId so notes do not leak between users", () => {
		localStorage.setItem("finalive-notes-alice-l1", "alice note");
		expect(getNotePreview("bob", "l1")).toBe("");
	});
});

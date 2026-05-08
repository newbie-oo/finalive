import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_BYTES, isSlipMimeAllowed } from "./upload-limits";

function makeFile(name: string, type: string): File {
	return new File(["x"], name, { type });
}

describe("upload-limits", () => {
	it("MAX_UPLOAD_BYTES is 5 MiB", () => {
		expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
	});

	describe("isSlipMimeAllowed", () => {
		it("accepts PNG", () => {
			expect(isSlipMimeAllowed(makeFile("a.png", "image/png"))).toBe(true);
		});
		it("accepts JPEG", () => {
			expect(isSlipMimeAllowed(makeFile("a.jpg", "image/jpeg"))).toBe(true);
		});
		it("accepts PDF", () => {
			expect(
				isSlipMimeAllowed(makeFile("slip.pdf", "application/pdf")),
			).toBe(true);
		});
		it("accepts HEIC by extension when MIME is empty", () => {
			expect(isSlipMimeAllowed(makeFile("photo.heic", ""))).toBe(true);
		});
		it("rejects text files", () => {
			expect(isSlipMimeAllowed(makeFile("a.txt", "text/plain"))).toBe(false);
		});
		it("rejects executables", () => {
			expect(
				isSlipMimeAllowed(
					makeFile("a.exe", "application/octet-stream"),
				),
			).toBe(false);
		});
	});
});

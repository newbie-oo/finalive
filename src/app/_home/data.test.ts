import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TESTIMONIALS, INSTRUCTOR_BADGES } from "./data";

describe("home/data", () => {
	it("freezes the TESTIMONIALS array so consumers cannot mutate it at runtime", () => {
		expect(Object.isFrozen(TESTIMONIALS)).toBe(true);
	});

	it("freezes the INSTRUCTOR_BADGES array", () => {
		expect(Object.isFrozen(INSTRUCTOR_BADGES)).toBe(true);
	});

	it("ships at least 3 testimonials", () => {
		expect(TESTIMONIALS.length).toBeGreaterThanOrEqual(3);
	});

	it("constrains testimonial ratings to 1–5", () => {
		for (const t of TESTIMONIALS) {
			expect(t.rating).toBeGreaterThanOrEqual(1);
			expect(t.rating).toBeLessThanOrEqual(5);
		}
	});

	it("requires every testimonial to have a non-empty quote, name and role", () => {
		for (const t of TESTIMONIALS) {
			expect(t.quote.length).toBeGreaterThan(0);
			expect(t.name.length).toBeGreaterThan(0);
			expect(t.role.length).toBeGreaterThan(0);
		}
	});

	it("does not import from server or db layers — this module is pure marketing copy", () => {
		const filePath = path.join(__dirname, "data.ts");
		const source = readFileSync(filePath, "utf8");
		expect(source).not.toMatch(/from\s+["']@\/server\//);
		expect(source).not.toMatch(/from\s+["']@\/db\//);
	});
});

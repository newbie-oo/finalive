import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
	STATS,
	FEATURED_COURSES,
	TESTIMONIALS,
	INSTRUCTOR_BADGES,
} from "./data";

describe("home/data", () => {
	it("freezes the STATS object so consumers cannot mutate it at runtime", () => {
		expect(Object.isFrozen(STATS)).toBe(true);
	});

	it("freezes the FEATURED_COURSES array", () => {
		expect(Object.isFrozen(FEATURED_COURSES)).toBe(true);
	});

	it("freezes the TESTIMONIALS array", () => {
		expect(Object.isFrozen(TESTIMONIALS)).toBe(true);
	});

	it("freezes the INSTRUCTOR_BADGES array", () => {
		expect(Object.isFrozen(INSTRUCTOR_BADGES)).toBe(true);
	});

	it("exposes exactly 3 featured courses", () => {
		expect(FEATURED_COURSES).toHaveLength(3);
	});

	it("gives every featured course a unique slug", () => {
		const slugs = FEATURED_COURSES.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("requires every featured course to have a title, summary and price", () => {
		for (const c of FEATURED_COURSES) {
			expect(c.title.length).toBeGreaterThan(0);
			expect(c.summary.length).toBeGreaterThan(0);
			expect(typeof c.priceTHB === "number" || c.priceTHB === "free").toBe(
				true,
			);
		}
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

	it("source file imports nothing from the server or db layers (static guarantee)", () => {
		const filePath = path.join(__dirname, "data.ts");
		const source = readFileSync(filePath, "utf8");
		expect(source).not.toMatch(/from\s+["']@\/server\//);
		expect(source).not.toMatch(/from\s+["']@\/db\//);
		expect(source).not.toMatch(/unstable_cache/);
	});
});

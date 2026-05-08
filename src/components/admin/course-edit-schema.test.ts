import { describe, it, expect } from "vitest";
import { courseEditSchema } from "./course-edit-schema";

const valid = {
	slug: "my-course",
	title: "Course",
	summary: "A summary",
	price: "1500",
	isFree: false,
	status: "draft" as const,
};

function issuesFor(input: unknown, path: string): string[] {
	const result = courseEditSchema.safeParse(input);
	if (result.success) return [];
	return result.error.issues
		.filter((i) => i.path.join(".") === path)
		.map((i) => i.message);
}

describe("courseEditSchema", () => {
	it("accepts a fully valid paid course", () => {
		expect(courseEditSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects an empty slug", () => {
		expect(issuesFor({ ...valid, slug: "" }, "slug")).toContain(
			"Slug จำเป็นต้องกรอก",
		);
	});

	it("rejects a slug with uppercase or invalid characters", () => {
		expect(issuesFor({ ...valid, slug: "My_Course" }, "slug")).toContain(
			"ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น",
		);
	});

	it("rejects a whitespace-only title", () => {
		expect(issuesFor({ ...valid, title: "   " }, "title")).toContain(
			"ชื่อคอร์สจำเป็นต้องกรอก",
		);
	});

	it("rejects an unknown status", () => {
		const result = courseEditSchema.safeParse({
			...valid,
			status: "trashed",
		});
		expect(result.success).toBe(false);
	});

	// ── price × isFree conditional matrix ──
	it("requires price when isFree is false and price is empty", () => {
		expect(issuesFor({ ...valid, price: "" }, "price")).toContain(
			"ราคาจำเป็นต้องกรอก",
		);
	});

	it("rejects a non-numeric price when isFree is false", () => {
		expect(issuesFor({ ...valid, price: "abc" }, "price")).toContain(
			"ราคาต้องเป็นตัวเลข (ทศนิยมไม่เกิน 2 ตำแหน่ง)",
		);
	});

	it("rejects a price with three decimal places", () => {
		expect(issuesFor({ ...valid, price: "100.000" }, "price")).toContain(
			"ราคาต้องเป็นตัวเลข (ทศนิยมไม่เกิน 2 ตำแหน่ง)",
		);
	});

	it("accepts a price with two decimal places", () => {
		const result = courseEditSchema.safeParse({ ...valid, price: "1500.50" });
		expect(result.success).toBe(true);
	});

	it("skips the price rule entirely when isFree is true", () => {
		// Empty + non-numeric prices BOTH pass when isFree, because the form
		// will overwrite price with "0.00" before submit anyway.
		expect(
			courseEditSchema.safeParse({ ...valid, isFree: true, price: "" })
				.success,
		).toBe(true);
		expect(
			courseEditSchema.safeParse({ ...valid, isFree: true, price: "garbage" })
				.success,
		).toBe(true);
	});
});

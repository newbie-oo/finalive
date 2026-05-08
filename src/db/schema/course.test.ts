import { describe, it, expect } from "vitest";
import { COURSE_STATUS, type CourseStatus, type CourseStatusFilter } from "./course";

describe("COURSE_STATUS", () => {
	it("contains exactly draft, published, archived", () => {
		expect([...COURSE_STATUS].sort()).toEqual(
			["archived", "draft", "published"],
		);
	});

	it("has length 3 (no silent additions)", () => {
		expect(COURSE_STATUS).toHaveLength(3);
	});

	it("CourseStatus union accepts every member", () => {
		const samples: CourseStatus[] = ["draft", "published", "archived"];
		expect(samples).toHaveLength(3);
	});

	it("CourseStatusFilter accepts members and 'all'", () => {
		const samples: CourseStatusFilter[] = [
			"draft",
			"published",
			"archived",
			"all",
		];
		expect(samples).toHaveLength(4);
	});
});

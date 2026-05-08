import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
	normalizeCoursePrice,
	normalizeCoursePriceRequired,
} from "./course-price";

describe("normalizeCoursePrice", () => {
	it("forces price to 0.00 when isFree is true", () => {
		expect(normalizeCoursePrice({ price: "499.00", isFree: true })).toEqual({
			price: "0.00",
			isFree: true,
		});
	});

	it("flips isFree to true when price is 0 (closes the ฿0 + paid-flow bug)", () => {
		expect(normalizeCoursePrice({ price: "0", isFree: false })).toEqual({
			price: "0.00",
			isFree: true,
		});
		expect(normalizeCoursePrice({ price: "0.00" })).toEqual({
			price: "0.00",
			isFree: true,
		});
	});

	it("leaves a paid course untouched", () => {
		expect(normalizeCoursePrice({ price: "499.00", isFree: false })).toEqual({
			price: "499.00",
			isFree: false,
		});
	});

	it("passes through undefined values for partial updates", () => {
		expect(normalizeCoursePrice({})).toEqual({
			price: undefined,
			isFree: undefined,
		});
		expect(normalizeCoursePrice({ price: "299.00" })).toEqual({
			price: "299.00",
			isFree: undefined,
		});
	});

	it("isFree=false alone does not zero a missing price", () => {
		// Update path: caller did not touch price; we must not invent "0.00".
		expect(normalizeCoursePrice({ isFree: false })).toEqual({
			price: undefined,
			isFree: false,
		});
	});
});

describe("normalizeCoursePriceRequired", () => {
	it("returns concrete values for the create path", () => {
		expect(
			normalizeCoursePriceRequired({ price: "0", isFree: false }),
		).toEqual({ price: "0.00", isFree: true });

		expect(
			normalizeCoursePriceRequired({ price: "499.00", isFree: false }),
		).toEqual({ price: "499.00", isFree: false });

		expect(
			normalizeCoursePriceRequired({ price: "499.00", isFree: true }),
		).toEqual({ price: "0.00", isFree: true });
	});
});

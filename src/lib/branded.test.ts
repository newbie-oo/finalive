import { describe, it, expect } from "vitest";
import {
	asCourseId,
	asUserId,
	courseIdSchema,
	lessonIdSchema,
	userIdSchema,
} from "./branded";

describe("brand cast helpers", () => {
	it("preserve the underlying string value at runtime", () => {
		const raw = "11111111-1111-1111-1111-111111111111";
		expect(asCourseId(raw)).toBe(raw);
		expect(asUserId("user_abc")).toBe("user_abc");
	});

	it("are nominal at the type level (sanity, runtime no-op)", () => {
		// The compile-time guarantee can't be tested at runtime — this just
		// pins the cast helper as the only allowed path.
		const u = asUserId("u");
		const c = asCourseId("11111111-1111-1111-1111-111111111111");
		expect(typeof u).toBe("string");
		expect(typeof c).toBe("string");
	});
});

describe("brand zod schemas", () => {
	it("courseIdSchema accepts a uuid and returns a branded value", () => {
		const id = "11111111-1111-1111-1111-111111111111";
		const parsed = courseIdSchema.parse(id);
		expect(parsed).toBe(id);
	});

	it("courseIdSchema rejects non-uuid input", () => {
		expect(() => courseIdSchema.parse("not-a-uuid")).toThrow();
		expect(() => courseIdSchema.parse(42)).toThrow();
	});

	it("lessonIdSchema rejects non-uuid input", () => {
		expect(() => lessonIdSchema.parse("not-a-uuid")).toThrow();
	});

	it("userIdSchema accepts non-uuid strings (Better Auth user.id is text)", () => {
		expect(userIdSchema.parse("user_text_id")).toBe("user_text_id");
	});

	it("userIdSchema rejects empty string", () => {
		expect(() => userIdSchema.parse("")).toThrow();
	});
});

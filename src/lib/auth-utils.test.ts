import { describe, it, expect } from "vitest";
import { isAdmin } from "./auth-utils";

describe("isAdmin", () => {
	it("returns true for { role: 'admin' }", () => {
		expect(isAdmin({ role: "admin" })).toBe(true);
	});
	it("returns false for { role: 'user' }", () => {
		expect(isAdmin({ role: "user" })).toBe(false);
	});
	it("returns false for missing role", () => {
		expect(isAdmin({})).toBe(false);
	});
	it("returns false for null/undefined", () => {
		expect(isAdmin(null)).toBe(false);
		expect(isAdmin(undefined)).toBe(false);
	});
	it("treats other roles as non-admin", () => {
		expect(isAdmin({ role: "owner" })).toBe(false);
	});
});

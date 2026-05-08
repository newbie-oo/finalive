import { describe, it, expect } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys", () => {
	it("admin slip list root invalidates all per-status caches", () => {
		const root = queryKeys.adminSlips.all();
		const submitted = queryKeys.adminSlips.byStatus("submitted");
		expect(submitted[0]).toBe(root[0]);
	});

	it("returns fresh arrays so mutation does not leak across callers", () => {
		const a = queryKeys.adminSlips.all();
		const b = queryKeys.adminSlips.all();
		expect(a).not.toBe(b);
	});

	it("scopes slip image and pending status by id", () => {
		expect(queryKeys.slipImageUrl("s1")).toEqual(["slip-image-url", "s1"]);
		expect(queryKeys.pendingStatus("p1")).toEqual(["pending-status", "p1"]);
	});
});

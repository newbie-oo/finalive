import { describe, it, expect } from "vitest";
import { generateCertCode } from "./cert-code";

describe("generateCertCode", () => {
	it("returns CERT-<year>-<8 hex chars uppercase>", () => {
		const code = generateCertCode();
		const year = new Date().getFullYear();
		expect(code).toMatch(new RegExp(`^CERT-${year}-[0-9A-F]{8}$`));
	});

	it("produces unique codes across many calls", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 200; i++) seen.add(generateCertCode());
		// 4 random bytes → 32-bit space; 200 codes should not collide in practice.
		expect(seen.size).toBe(200);
	});
});

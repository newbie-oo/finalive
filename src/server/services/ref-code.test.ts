import { describe, it, expect } from "vitest";
import { generateRefCode } from "./ref-code";

describe("generateRefCode", () => {
  it("starts with FL- and is 11 chars total", () => {
    const code = generateRefCode();
    expect(code).toMatch(/^FL-[A-HJ-NP-Z2-9]{8}$/);
  });

  it("avoids visually ambiguous characters (0, O, 1, I)", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRefCode();
      expect(code).not.toMatch(/[O0I1]/);
    }
  });

  it("rare collision over 10k iterations", () => {
    const set = new Set(Array.from({ length: 10_000 }, () => generateRefCode()));
    expect(set.size).toBeGreaterThan(9_990);
  });
});

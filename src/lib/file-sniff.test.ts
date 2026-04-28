import { describe, it, expect } from "vitest";
import { sniffImageType } from "./file-sniff";

describe("sniffImageType", () => {
  it("detects PNG by 89 50 4E 47", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageType(png)).toBe("image/png");
  });

  it("detects JPEG by FF D8 FF", () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(sniffImageType(jpg)).toBe("image/jpeg");
  });

  it("returns unknown for HTML/SVG/exe payloads", () => {
    expect(sniffImageType(Buffer.from("<html"))).toBe("unknown");
    expect(sniffImageType(Buffer.from("<?xml"))).toBe("unknown");
    expect(sniffImageType(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBe("unknown"); // PE/EXE
  });

  it("returns unknown for too-small buffers", () => {
    expect(sniffImageType(Buffer.from([0x89]))).toBe("unknown");
    expect(sniffImageType(Buffer.from([]))).toBe("unknown");
  });
});

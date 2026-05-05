import { describe, it, expect } from "vitest";
import { sniffImageType, sniffSlipFile } from "./file-sniff";

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
    expect(sniffImageType(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBe(
      "unknown",
    ); // PE/EXE
  });

  it("returns unknown for too-small buffers", () => {
    expect(sniffImageType(Buffer.from([0x89]))).toBe("unknown");
    expect(sniffImageType(Buffer.from([]))).toBe("unknown");
  });
});

function buf(...nums: number[]) {
  return Buffer.from(nums);
}

describe("sniffSlipFile (PNG / JPEG / PDF / HEIC)", () => {
  it("recognizes PNG", () => {
    expect(
      sniffSlipFile(buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("image/png");
  });

  it("recognizes JPEG", () => {
    expect(sniffSlipFile(buf(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("recognizes PDF (%PDF-)", () => {
    expect(sniffSlipFile(Buffer.from("%PDF-1.7\n%test", "ascii"))).toBe(
      "application/pdf",
    );
  });

  it("recognizes HEIC ftyp boxes (heic, heix, mif1)", () => {
    for (const brand of ["heic", "heix", "mif1", "msf1", "heim", "heis"]) {
      const file = Buffer.concat([
        buf(0x00, 0x00, 0x00, 0x18),
        Buffer.from("ftyp", "ascii"),
        Buffer.from(brand, "ascii"),
      ]);
      expect(sniffSlipFile(file)).toBe("image/heic");
    }
  });

  it("rejects mp4 ftyp (video, not an image)", () => {
    const mp4 = Buffer.concat([
      buf(0x00, 0x00, 0x00, 0x18),
      Buffer.from("ftyp", "ascii"),
      Buffer.from("mp42", "ascii"),
    ]);
    expect(sniffSlipFile(mp4)).toBe("unknown");
  });

  it("rejects EXE / random / empty", () => {
    expect(sniffSlipFile(buf(0x4d, 0x5a, 0x90, 0x00))).toBe("unknown");
    expect(sniffSlipFile(Buffer.alloc(0))).toBe("unknown");
    expect(sniffSlipFile(buf(0x89))).toBe("unknown");
  });
});

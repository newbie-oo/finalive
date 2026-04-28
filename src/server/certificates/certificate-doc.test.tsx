import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDoc } from "./certificate-doc";

describe("CertificateDoc", () => {
  it("renders a PDF with expected byte count", async () => {
    const buffer = await renderToBuffer(
      <CertificateDoc
        studentName="Student A"
        courseTitle="Python For Investing"
        completedAt={new Date("2026-04-28")}
        certCode="CERT-2026-ABC123"
      />,
    );

    expect(buffer.length).toBeGreaterThan(5_000);
    expect(buffer.length).toBeLessThan(500_000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders Thai text without error", async () => {
    const buffer = await renderToBuffer(
      <CertificateDoc
        studentName="สมชาย ใจดี"
        courseTitle="พื้นฐาน Python"
        completedAt={new Date("2026-04-28")}
        certCode="CERT-2026-ทดสอบ"
      />,
    );

    // Thai text is embedded as font glyphs, not plain text in PDF binary.
    expect(buffer.length).toBeGreaterThan(5_000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

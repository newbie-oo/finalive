import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { CourseCompleted, courseCompletedSubject } from "./course-completed";

describe("course-completed email", () => {
  it("contains cert code, verify URL and PDF URL", async () => {
    const html = await render(
      CourseCompleted({
        name: "Student A",
        courseTitle: "Python For Investing",
        certCode: "CERT-2026-ABC123",
        verifyUrl: "https://finalive.dev/verify/CERT-2026-ABC123",
        pdfUrl: "https://cdn.finalive.dev/certs/CERT-2026-ABC123.pdf",
      }),
    );

    expect(html).toContain("Python For Investing");
    expect(html).toContain("CERT-2026-ABC123");
    expect(html).toContain("/verify/CERT-2026-ABC123");
    expect(html).toContain(".pdf");
  });

  it("has correct subject", () => {
    expect(courseCompletedSubject).toContain("ยินดีด้วย");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import {
  getCertificateByEnrollmentId,
  getCertificateByCode,
  createCertificate,
} from "@/server/repos/certificate";
import { generateCertCode } from "@/server/services/cert-code";

async function reset() {
  await db.execute(sql`
    TRUNCATE certificate, media_asset, enrollment, lesson, module, course, "user" CASCADE
  `);
}

describe("certificate repo", () => {
  beforeEach(reset);

  it("getCertificateByEnrollmentId returns null when not exists", async () => {
    const result = await getCertificateByEnrollmentId(randomUUID());
    expect(result).toBeNull();
  });

  it("creates and retrieves certificate by enrollment id", async () => {
    const adminId = randomUUID();
    const studentId = randomUUID();
    await db.insert(userTable).values([
      { id: adminId, email: "admin@test", name: "Admin", role: "admin" },
      { id: studentId, email: "s@test", name: "Student", role: "user" },
    ]);

    const [c] = await db
      .insert(course)
      .values({
        slug: "cert-course",
        title: "Cert Course",
        summary: "S",
        ownerUserId: adminId,
        status: "published",
        createdByUserId: adminId,
      })
      .returning({ id: course.id });

    const [mod] = await db
      .insert(courseModule)
      .values({
        courseId: c!.id,
        title: "M1",
        sortOrder: 1,
        createdByUserId: adminId,
      })
      .returning({ id: courseModule.id });

    await db.insert(lesson).values({
      moduleId: mod!.id,
      title: "L1",
      sortOrder: 1,
      bodyMd: "body",
      createdByUserId: adminId,
    });

    const [en] = await db
      .insert(enrollment)
      .values({
        userId: studentId,
        courseId: c!.id,
        source: "free_course",
        status: "active",
        completedAt: new Date(),
      })
      .returning({ id: enrollment.id });

    const [ma] = await db
      .insert(mediaAsset)
      .values({
        kind: "pdf",
        storage: "r2_public",
        storageKey: "certs/test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        status: "ready",
        createdByUserId: adminId,
      })
      .returning({ id: mediaAsset.id });

    const certCode = generateCertCode();
    const certId = await createCertificate({
      enrollmentId: en!.id,
      certCode,
      pdfMediaId: ma!.id,
    });

    const byEnroll = await getCertificateByEnrollmentId(en!.id);
    expect(byEnroll).not.toBeNull();
    expect(byEnroll!.certCode).toBe(certCode);
    expect(byEnroll!.id).toBe(certId);

    const byCode = await getCertificateByCode(certCode);
    expect(byCode).not.toBeNull();
    expect(byCode!.id).toBe(certId);
  });
});

describe("cert-code service", () => {
  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateCertCode());
    }
    expect(codes.size).toBe(100);
    for (const c of codes) {
      expect(c).toMatch(/^CERT-\d{4}-[A-F0-9]{8}$/);
    }
  });
});

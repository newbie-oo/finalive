import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { mediaAsset } from "@/db/schema/media";
import { certificate } from "@/db/schema/certificate";
import { getCertificateForVerify } from "@/server/repos/certificate";

const ADMIN_ID = randomUUID();
const STUDENT_ID = randomUUID();
const COURSE_ID = randomUUID();
const ENROLL_ID = randomUUID();
const MEDIA_ID = randomUUID();
const CERT_CODE = "FL-VERIFY-TEST-1";
const REVOKED_CODE = "FL-VERIFY-REV-1";

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "certificate", "enrollment", "media_asset", "course", "user" CASCADE`);
  await db.insert(user).values([
    { id: ADMIN_ID, email: "v-admin@y.test", name: "A", role: "admin" },
    { id: STUDENT_ID, email: "v-stu@y.test", name: "ผู้เรียน Test", role: "user" },
  ]);
  await db.insert(course).values({
    id: COURSE_ID,
    slug: "verify-test",
    title: "Verify Course",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    isFree: true,
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN_ID,
  });
  await db.insert(enrollment).values({
    id: ENROLL_ID,
    userId: STUDENT_ID,
    courseId: COURSE_ID,
    status: "active",
    source: "free_course",
    completedAt: new Date("2026-04-01"),
  });
  await db.insert(mediaAsset).values({
    id: MEDIA_ID,
    kind: "pdf",
    storage: "r2_public",
    storageKey: "certs/test.pdf",
    mimeType: "application/pdf",
    createdByUserId: ADMIN_ID,
  });
  await db.insert(certificate).values([
    { enrollmentId: ENROLL_ID, certCode: CERT_CODE, pdfMediaId: MEDIA_ID },
  ]);

  // Build a second enrollment + revoked cert
  const ENROLL2 = randomUUID();
  const COURSE2 = randomUUID();
  await db.insert(course).values({
    id: COURSE2,
    slug: "verify-test-2",
    title: "Verify Course 2",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    isFree: true,
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN_ID,
  });
  await db.insert(enrollment).values({
    id: ENROLL2,
    userId: STUDENT_ID,
    courseId: COURSE2,
    status: "active",
    source: "free_course",
    completedAt: new Date("2026-04-02"),
  });
  await db.insert(certificate).values({
    enrollmentId: ENROLL2,
    certCode: REVOKED_CODE,
    pdfMediaId: MEDIA_ID,
    revokedAt: new Date("2026-04-15"),
    revokedByUserId: ADMIN_ID,
    revokeReason: "test",
  });
});

describe("getCertificateForVerify (public verification path)", () => {
  it("returns cert info including student + course for a valid code", async () => {
    const r = await getCertificateForVerify(CERT_CODE);
    expect(r).not.toBeNull();
    expect(r!.certCode).toBe(CERT_CODE);
    expect(r!.studentName).toBe("ผู้เรียน Test");
    expect(r!.courseTitle).toBe("Verify Course");
    expect(r!.revokedAt).toBeNull();
  });

  it("returns the revokedAt timestamp for a revoked code so the UI can show it", async () => {
    const r = await getCertificateForVerify(REVOKED_CODE);
    expect(r).not.toBeNull();
    expect(r!.revokedAt).toBeInstanceOf(Date);
  });

  it("returns null for a non-existent code", async () => {
    const r = await getCertificateForVerify("FL-NOT-A-REAL-CODE");
    expect(r).toBeNull();
  });
});

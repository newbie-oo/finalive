import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { certificate } from "@/db/schema/certificate";
import { enrollment } from "@/db/schema/enrollment";
import { user as userTable } from "@/db/schema/auth";
import { course as courseTable } from "@/db/schema/course";

export async function getCertificateByEnrollmentId(enrollmentId: string) {
  const rows = await db
    .select()
    .from(certificate)
    .where(eq(certificate.enrollmentId, enrollmentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCertificateByCode(certCode: string) {
  const rows = await db
    .select()
    .from(certificate)
    .where(eq(certificate.certCode, certCode))
    .limit(1);
  return rows[0] ?? null;
}

export interface AdminCertificateListItem {
  id: string;
  certCode: string;
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
  revokedAt: Date | null;
}

export async function listAllCertificates(): Promise<
  AdminCertificateListItem[]
> {
  const rows = await db
    .select({
      id: certificate.id,
      certCode: certificate.certCode,
      studentName: userTable.name,
      courseTitle: courseTable.title,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
    })
    .from(certificate)
    .innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
    .innerJoin(userTable, eq(enrollment.userId, userTable.id))
    .innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
    .orderBy(certificate.issuedAt);

  return rows;
}

export async function revokeCertificate(
  certId: string,
  adminUserId: string,
  reason: string,
): Promise<void> {
  await db
    .update(certificate)
    .set({
      revokedAt: new Date(),
      revokedByUserId: adminUserId,
      revokeReason: reason,
    })
    .where(eq(certificate.id, certId));
}

export interface CertificateListItem {
  certCode: string;
  courseTitle: string;
  issuedAt: Date;
  revokedAt: Date | null;
}

export async function listCertificatesByUserId(
  userId: string,
): Promise<CertificateListItem[]> {
  const rows = await db
    .select({
      certCode: certificate.certCode,
      courseTitle: courseTable.title,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
    })
    .from(certificate)
    .innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
    .innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
    .where(eq(enrollment.userId, userId))
    .orderBy(certificate.issuedAt);

  return rows;
}

export interface VerifyCertificateResult {
  certCode: string;
  issuedAt: Date;
  revokedAt: Date | null;
  studentName: string;
  courseTitle: string;
  completedAt: Date;
}

export async function getCertificateForVerify(
  certCode: string,
): Promise<VerifyCertificateResult | null> {
  const certRows = await db
    .select({
      certCode: certificate.certCode,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
      completedAt: enrollment.completedAt,
      studentName: userTable.name,
      courseTitle: courseTable.title,
    })
    .from(certificate)
    .innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
    .innerJoin(userTable, eq(enrollment.userId, userTable.id))
    .innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
    .where(eq(certificate.certCode, certCode))
    .limit(1);

  const row = certRows[0];
  if (!row) return null;

  return {
    certCode: row.certCode,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
    studentName: row.studentName ?? "",
    courseTitle: row.courseTitle,
    completedAt: row.completedAt ?? new Date(),
  };
}

export async function createCertificate(input: {
  enrollmentId: string;
  certCode: string;
  pdfMediaId: string;
}) {
  const [row] = await db
    .insert(certificate)
    .values({
      enrollmentId: input.enrollmentId,
      certCode: input.certCode,
      pdfMediaId: input.pdfMediaId,
    })
    .returning({ id: certificate.id });
  return row!.id;
}

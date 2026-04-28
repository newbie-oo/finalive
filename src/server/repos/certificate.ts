import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { certificate } from "@/db/schema/certificate";

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

"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { user as userTable } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { getCertificateByEnrollmentId, createCertificate } from "@/server/repos/certificate";
import { generateCertCode } from "@/server/services/cert-code";
import { putObject, publicUrl } from "@/server/services/r2";
import { CertificateDoc } from "@/server/certificates/certificate-doc";

export async function issueCertificate(enrollmentId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  // Idempotent: return existing certificate.
  const existing = await getCertificateByEnrollmentId(enrollmentId);
  if (existing) {
    return { ok: true, certCode: existing.certCode, pdfUrl: publicUrl(`certs/${existing.certCode}.pdf`) };
  }

  // Verify enrollment belongs to user and is completed.
  const [enrollRow] = await db
    .select({
      id: enrollment.id,
      userId: enrollment.userId,
      completedAt: enrollment.completedAt,
    })
    .from(enrollment)
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);

  if (!enrollRow) {
    return { ok: false, error: "enrollment_not_found" as const };
  }

  if (enrollRow.userId !== session.user.id) {
    return { ok: false, error: "not_yours" as const };
  }

  if (!enrollRow.completedAt) {
    return { ok: false, error: "not_completed" as const };
  }

  // Fetch course title and student name.
  const userRow = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  // Need to get course title via enrollment -> course.
  const courseRows = await db
    .select({ title: course.title })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .where(eq(enrollment.id, enrollmentId))
    .limit(1);

  const courseTitle = courseRows[0]?.title ?? "Course";
  const studentName = userRow[0]?.name ?? session.user.email ?? "Student";

  const certCode = generateCertCode();

  // Render PDF.
  const pdfBuffer = await renderToBuffer(
    <CertificateDoc
      studentName={studentName}
      courseTitle={courseTitle}
      completedAt={enrollRow.completedAt}
      certCode={certCode}
    />,
  );

  // Upload to R2 public bucket.
  const key = `certs/${certCode}.pdf`;
  await putObject({
    bucket: "public",
    key,
    body: pdfBuffer,
    contentType: "application/pdf",
  });

  // Create media_asset for the PDF.
  const [media] = await db
    .insert(mediaAsset)
    .values({
      kind: "pdf",
      storage: "r2_public",
      storageKey: key,
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.length,
      status: "ready",
      createdByUserId: session.user.id,
    })
    .returning({ id: mediaAsset.id });

  // Create certificate row.
  await createCertificate({
    enrollmentId,
    certCode,
    pdfMediaId: media!.id,
  });

  return { ok: true, certCode, pdfUrl: publicUrl(key) };
}

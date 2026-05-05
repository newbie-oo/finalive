import "server-only";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { mediaAsset } from "@/db/schema/media";
import { eq } from "drizzle-orm";
import {
  getCertificateByEnrollmentId,
  createCertificate,
} from "@/server/repos/certificate";
import { generateCertCode } from "@/server/services/cert-code";
import type { CertificateRenderer } from "./certificate-renderer";
import type { ObjectStorage } from "@/server/services/storage";
import type { CourseCompletionNotifier } from "@/server/services/notifier";
import type { CertificateData } from "./certificate-doc";

export type IssueCertificateResult =
  | { ok: true; certCode: string; pdfUrl: string }
  | { ok: false; error: IssueCertificateError };

export type IssueCertificateError =
  | "admin_no_cert"
  | "enrollment_not_found"
  | "not_yours"
  | "not_completed";

export interface CertificateIssuerDeps {
  renderer: CertificateRenderer;
  storage: ObjectStorage;
  notifier: CourseCompletionNotifier;
}

export class CertificateIssuer {
  constructor(private deps: CertificateIssuerDeps) {}

  async issue(
    enrollmentId: string,
    requestingUserId: string,
    requestingUserRole: string,
    requestingUserEmail: string,
  ): Promise<IssueCertificateResult> {
    // Admins preview courses without paying or enrolling — by design they
    // never earn a certificate. Refuse here regardless of enrollment state.
    if (requestingUserRole === "admin") {
      return { ok: false, error: "admin_no_cert" };
    }

    // Idempotent: return existing certificate.
    const existing = await getCertificateByEnrollmentId(enrollmentId);
    if (existing) {
      return {
        ok: true,
        certCode: existing.certCode,
        pdfUrl: this.deps.storage.urlFor(`certs/${existing.certCode}.pdf`),
      };
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
      return { ok: false, error: "enrollment_not_found" };
    }

    if (enrollRow.userId !== requestingUserId) {
      return { ok: false, error: "not_yours" };
    }

    if (!enrollRow.completedAt) {
      return { ok: false, error: "not_completed" };
    }

    // Fetch course title and student name.
    const [userRow] = await db
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, requestingUserId))
      .limit(1);

    const [courseRow] = await db
      .select({ title: course.title })
      .from(enrollment)
      .innerJoin(course, eq(enrollment.courseId, course.id))
      .where(eq(enrollment.id, enrollmentId))
      .limit(1);

    const courseTitle = courseRow?.title ?? "Course";
    const studentName = userRow?.name ?? requestingUserEmail ?? "Student";

    const certCode = generateCertCode();

    // Render PDF.
    const certData: CertificateData = {
      studentName,
      courseTitle,
      completedAt: enrollRow.completedAt,
      certCode,
    };
    const pdfBuffer = await this.deps.renderer.render(certData);

    // Upload to storage.
    const key = `certs/${certCode}.pdf`;
    await this.deps.storage.put(key, pdfBuffer, "application/pdf");

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
        createdByUserId: requestingUserId,
      })
      .returning({ id: mediaAsset.id });

    // Create certificate row.
    await createCertificate({
      enrollmentId,
      certCode,
      pdfMediaId: media!.id,
    });

    const pdfUrl = this.deps.storage.urlFor(key);

    // Best-effort email notification — failures here should not block the cert
    // issue itself. The email queue runs out-of-band so we just enqueue.
    try {
      await this.deps.notifier.notify({
        recipientEmail: requestingUserEmail,
        studentName,
        courseTitle,
        certCode,
        pdfUrl,
        userId: requestingUserId,
      });
    } catch (err) {
      console.error(
        "certificate: failed to enqueue course_completed email",
        err,
      );
    }

    return { ok: true, certCode, pdfUrl };
  }
}

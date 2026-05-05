import "server-only";
import { CertificateIssuer } from "@/server/certificates/certificate-issuer";
import { ReactPdfCertificateRenderer } from "@/server/certificates/certificate-renderer";
import { R2ObjectStorage } from "@/server/services/storage";
import { EmailCourseCompletionNotifier } from "@/server/services/notifier";

/**
 * Factory for the real CertificateIssuer adapter.
 * Centralises construction so callers don't duplicate the object graph.
 */
export function certificateIssuerFactory(): CertificateIssuer {
  return new CertificateIssuer({
    renderer: new ReactPdfCertificateRenderer(),
    storage: new R2ObjectStorage("public"),
    notifier: new EmailCourseCompletionNotifier(),
  });
}

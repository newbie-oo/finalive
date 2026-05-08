import Link from "next/link";
import { redirect } from "next/navigation";
import { Certificate as CertIcon } from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/server/auth-session";
import { listCertificatesByUserId } from "@/server/repos/certificate";
import { publicUrl } from "@/server/services/r2";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateCard } from "@/components/account/certificate-card";

export const dynamic = "force-dynamic";

export default async function AccountCertificatesPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/account/certificates");
  }

  const certs = await listCertificatesByUserId(session.user.id);

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-h1">ใบรับรองของฉัน</h1>
        <p className="mt-2 text-bodylg text-muted-foreground">
          ใบประกาศที่ออกให้คุณเมื่อเรียนจบคอร์ส
        </p>
      </header>

      {certs.length === 0 ? (
        <EmptyState
          icon={<CertIcon size={28} weight="duotone" />}
          title="ยังไม่มีใบรับรอง"
          description="เมื่อเรียนจบคอร์สที่ลงทะเบียนแล้ว ระบบจะออกใบรับรองให้อัตโนมัติ"
          action={
            <Button asChild variant="secondary">
              <Link href="/account/enrollments">ดูคอร์สของฉัน</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => (
            <li key={cert.certCode}>
              <CertificateCard
                certificate={{
                  certCode: cert.certCode,
                  courseTitle: cert.courseTitle,
                  issuedAt: cert.issuedAt,
                  pdfUrl: publicUrl(`certs/${cert.certCode}.pdf`),
                  revokedAt: cert.revokedAt,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

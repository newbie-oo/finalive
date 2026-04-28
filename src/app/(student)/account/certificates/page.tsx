import Link from "next/link";
import { redirect } from "next/navigation";
import { Certificate as CertIcon, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/server/auth-session";
import { listCertificatesByUserId } from "@/server/repos/certificate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

export const dynamic = "force-dynamic";

export default async function AccountCertificatesPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?redirect=/account/certificates");
  }

  const certs = await listCertificatesByUserId(session.user.id);

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-h1">ใบรับรองของฉัน</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
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
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => (
            <li key={cert.certCode}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <CertIcon size={28} weight="duotone" className="text-(--primary)" />
                  <StatusChip tone={cert.revokedAt ? "destructive" : "success"}>
                    {cert.revokedAt ? "ถูกเพิกถอน" : "ใช้งานได้"}
                  </StatusChip>
                </div>
                <h3 className="text-h4">{cert.courseTitle}</h3>
                <p className="text-uism text-(--foreground-muted)">
                  ออกเมื่อ {cert.issuedAt.toLocaleDateString("th-TH")}
                </p>
                <p className="mono text-uism text-(--foreground-subtle)">{cert.certCode}</p>
                {cert.revokedAt && (
                  <p className="text-uism text-destructive">
                    ถูกเพิกถอนเมื่อ {cert.revokedAt.toLocaleDateString("th-TH")}
                  </p>
                )}
                <div className="mt-auto pt-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/verify/${cert.certCode}`}>
                      ตรวจสอบ <ArrowRight size={14} weight="bold" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

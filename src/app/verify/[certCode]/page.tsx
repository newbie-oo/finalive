import {
  CheckCircle,
  XCircle,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { getCertificateForVerify } from "@/server/repos/certificate";
import { publicUrl } from "@/server/services/r2";

export const dynamic = "force-dynamic";

const dateFmt: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certCode: string }>;
}) {
  const { certCode } = await params;
  const cert = await getCertificateForVerify(certCode);

  if (!cert) {
    return (
      <PublicShell>
        <section className="mx-auto max-w-[720px] px-6 py-16">
          <Card className="space-y-4 text-center">
            <XCircle
              size={64}
              weight="fill"
              className="mx-auto text-destructive"
            />
            <h1 className="text-h1">ไม่พบใบรับรอง</h1>
            <p className="text-body text-muted-foreground">
              รหัส <span className="mono">{certCode}</span> ไม่มีในระบบ
            </p>
          </Card>
        </section>
      </PublicShell>
    );
  }

  const isRevoked = cert.revokedAt !== null;

  return (
    <PublicShell>
      <section className="mx-auto max-w-[720px] px-6 py-12">
        <Card className="space-y-6">
          <header className="flex flex-col items-center gap-3 text-center">
            {isRevoked ? (
              <XCircle size={64} weight="fill" className="text-destructive" />
            ) : (
              <CheckCircle size={64} weight="fill" className="text-success" />
            )}
            <StatusChip tone={isRevoked ? "destructive" : "success"}>
              {isRevoked ? "ถูกเพิกถอน" : "ใช้งานได้"}
            </StatusChip>
            <h1 className="text-h1">
              {isRevoked ? "ใบรับรองถูกเพิกถอน" : "ใบรับรองถูกต้อง"}
            </h1>
          </header>

          <dl className="divide-y divide-border rounded-card border border-border bg-muted">
            {[
              { k: "ชื่อผู้สำเร็จการศึกษา", v: cert.studentName },
              { k: "คอร์ส", v: cert.courseTitle },
              {
                k: "วันที่สำเร็จ",
                v: cert.completedAt.toLocaleDateString("th-TH", dateFmt),
              },
              {
                k: "วันที่ออกใบรับรอง",
                v: cert.issuedAt.toLocaleDateString("th-TH", dateFmt),
              },
              {
                k: "เลขที่",
                v: <span className="mono text-uism">{cert.certCode}</span>,
              },
            ].map((row) => (
              <div
                key={row.k}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <dt className="text-uism text-muted-foreground">{row.k}</dt>
                <dd className="text-ui font-medium text-foreground">
                  {row.v}
                </dd>
              </div>
            ))}
          </dl>

          {!isRevoked && (
            <div className="flex justify-center">
              <Button asChild variant="primary" size="md">
                <a
                  href={publicUrl(`certs/${cert.certCode}.pdf`)}
                  target="_blank"
                  rel="noopener"
                >
                  <DownloadSimple size={16} weight="bold" /> ดาวน์โหลดใบรับรอง
                  (PDF)
                </a>
              </Button>
            </div>
          )}

          <p className="text-center text-caption text-foreground-subtle">
            ตรวจสอบโดย Finalive Learning Platform ·{" "}
            {new Date().toLocaleDateString("th-TH", dateFmt)}
          </p>
        </Card>
      </section>
    </PublicShell>
  );
}

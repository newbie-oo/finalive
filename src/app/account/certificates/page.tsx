import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth-session";
import { listCertificatesByUserId } from "@/server/repos/certificate";

export const dynamic = "force-dynamic";

export default async function AccountCertificatesPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?redirect=/account/certificates");
  }

  const certs = await listCertificatesByUserId(session.user.id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">ใบรับรองของฉัน</h1>

      {certs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          ยังไม่มีใบรับรอง สำเร็จคอร์สแล้วจะได้รับใบรับรองอัตโนมัติ
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {certs.map((cert) => (
            <div
              key={cert.certCode}
              className={`flex items-center justify-between rounded border p-4 ${
                cert.revokedAt
                  ? "border-destructive bg-destructive/5"
                  : "border-border bg-card"
              }`}
            >
              <div>
                <p className="font-medium">{cert.courseTitle}</p>
                <p className="text-xs text-muted-foreground">
                  ออกเมื่อ {cert.issuedAt.toLocaleDateString("th-TH")}
                </p>
                {cert.revokedAt && (
                  <p className="text-xs text-destructive">
                    ถูกเพิกถอน {cert.revokedAt.toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
              <Link
                href={`/verify/${cert.certCode}`}
                className="text-sm text-primary hover:underline"
              >
                ตรวจสอบ →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

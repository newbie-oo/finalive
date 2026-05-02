import Link from "next/link";
import { Certificate as CertIcon } from "@phosphor-icons/react/dist/ssr";
import { listAllCertificates } from "@/server/repos/certificate";
import { RevokeButton } from "@/components/admin/revoke-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const certs = await listAllCertificates();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-h1">ใบรับรองทั้งหมด</h1>
        <p className="mt-1 text-body text-(--foreground-muted)">{certs.length} ใบ</p>
      </header>

      {certs.length === 0 ? (
        <EmptyState
          icon={<CertIcon size={28} weight="duotone" />}
          title="ยังไม่มีใบรับรอง"
          description="ใบรับรองจะถูกออกอัตโนมัติเมื่อนักเรียนเรียนจบคอร์สที่ลงทะเบียน"
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-(--border) bg-(--surface)">
          <table className="w-full text-ui">
            <thead>
              <tr className="border-b border-(--border) bg-(--surface-muted) text-left">
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">เลขที่</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">ผู้สำเร็จการศึกษา</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">คอร์ส</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">วันที่ออก</th>
                <th className="px-5 py-3 text-uism font-semibold text-(--foreground-muted)">สถานะ</th>
                <th className="px-5 py-3" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => (
                <tr key={cert.id} className="border-b border-(--border) last:border-b-0">
                  <td className="mono px-5 py-3 text-uism text-(--foreground)">{cert.certCode}</td>
                  <td className="px-5 py-3 text-(--foreground)">{cert.studentName}</td>
                  <td className="px-5 py-3 text-(--foreground-muted)">{cert.courseTitle}</td>
                  <td className="num px-5 py-3 text-uism text-(--foreground-muted)">
                    {cert.issuedAt.toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-5 py-3">
                    <StatusChip tone={cert.revokedAt ? "destructive" : "success"}>
                      {cert.revokedAt ? "ถูกเพิกถอน" : "ใช้งานได้"}
                    </StatusChip>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/verify/${cert.certCode}`}
                        className="text-uism font-medium text-(--primary) hover:underline"
                      >
                        ตรวจสอบ
                      </Link>
                      {!cert.revokedAt && <RevokeButton certId={cert.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

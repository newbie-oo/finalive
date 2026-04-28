import Link from "next/link";
import { listAllCertificates } from "@/server/repos/certificate";
import { RevokeButton } from "@/components/admin/revoke-button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  const certs = await listAllCertificates();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">ใบรับรองทั้งหมด</h1>

      {certs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🏆"
            title="ยังไม่มีใบรับรอง"
            description="ใบรับรองจะถูกออกอัตโนมัติเมื่อนักเรียนเรียนจบคอร์สที่ลงทะเบียน"
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">เลขที่</th>
                <th className="pb-2 pr-4">ผู้สำเร็จการศึกษา</th>
                <th className="pb-2 pr-4">คอร์ส</th>
                <th className="pb-2 pr-4">วันที่ออก</th>
                <th className="pb-2 pr-4">สถานะ</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {certs.map((cert) => (
                <tr key={cert.id} className="border-b">
                  <td className="py-3 pr-4 font-mono text-xs">{cert.certCode}</td>
                  <td className="py-3 pr-4">{cert.studentName}</td>
                  <td className="py-3 pr-4">{cert.courseTitle}</td>
                  <td className="py-3 pr-4">
                    {cert.issuedAt.toLocaleDateString("th-TH")}
                  </td>
                  <td className="py-3 pr-4">
                    {cert.revokedAt ? (
                      <span className="text-destructive">เพิกถอน</span>
                    ) : (
                      <span className="text-green-600">ใช้งานได้</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/verify/${cert.certCode}`}
                        className="text-xs text-primary hover:underline"
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
    </div>
  );
}

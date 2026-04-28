import { getCertificateForVerify } from "@/server/repos/certificate";

export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certCode: string }>;
}) {
  const { certCode } = await params;
  const cert = await getCertificateForVerify(certCode);

  if (!cert) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold text-destructive">
          ไม่พบใบรับรอง
        </h1>
        <p className="text-sm text-muted-foreground">
          รหัส {certCode} ไม่มีในระบบ
        </p>
      </div>
    );
  }

  const isRevoked = cert.revokedAt !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div
        className={`w-full max-w-lg rounded-lg border bg-card p-8 shadow-sm ${
          isRevoked ? "border-destructive" : "border-border"
        }`}
      >
        <div className="text-center">
          {isRevoked ? (
            <div className="mb-4 inline-block rounded bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
              ถูกเพิกถอน
            </div>
          ) : (
            <div className="mb-4 inline-block rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
              ใช้งานได้
            </div>
          )}

          <h1 className="text-2xl font-semibold">
            {isRevoked ? "ใบรับรองถูกเพิกถอน" : "ใบรับรองถูกต้อง"}
          </h1>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ชื่อผู้สำเร็จการศึกษา</span>
            <span className="font-medium">{cert.studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">คอร์ส</span>
            <span className="font-medium">{cert.courseTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">วันที่สำเร็จ</span>
            <span className="font-medium">
              {cert.completedAt.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">วันที่ออกใบรับรอง</span>
            <span className="font-medium">
              {cert.issuedAt.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">เลขที่</span>
            <span className="font-mono text-xs">{cert.certCode}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        ตรวจสอบโดย Finalive Learning Platform
      </p>
    </div>
  );
}

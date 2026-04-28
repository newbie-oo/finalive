import Link from "next/link";
import { getAdminDashboardCounts } from "@/server/repos/admin-dashboard";

interface StatCardProps {
  label: string;
  value: number;
  href?: string;
  hint?: string;
}

function StatCard({ label, value, href, hint }: StatCardProps) {
  const inner = (
    <div className="flex h-full flex-col gap-2 rounded-[12px] border border-(--border) bg-(--surface) p-5 transition-colors hover:border-(--primary)">
      <span className="text-caption font-semibold uppercase tracking-wide text-foreground-subtle">
        {label}
      </span>
      <span className="num text-h1 font-semibold text-(--foreground)">{value}</span>
      {hint ? <span className="text-uism text-(--foreground-muted)">{hint}</span> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const c = await getAdminDashboardCounts();
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-h1">แผงควบคุม</h1>
        <p className="mt-1 text-body text-(--foreground-muted)">ภาพรวมสถานะระบบและการดำเนินการล่าสุด</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="สลิปรอตรวจ" value={c.slipsSubmitted} href="/admin/slips?status=submitted" />
        <StatCard label="อนุมัติวันนี้" value={c.slipsAcceptedToday} href="/admin/slips?status=accepted" />
        <StatCard label="ปฏิเสธวันนี้" value={c.slipsRejectedToday} href="/admin/slips?status=rejected" />
        <StatCard label="นักเรียนกำลังเรียน" value={c.enrollmentsActive} />
        <StatCard label="คอร์สเผยแพร่" value={c.coursesPublished} href="/admin/courses" />
        <StatCard label="รายได้เดือนนี้" value={c.revenueMtd} hint="บาท" />
        <StatCard label="ใบประกาศเดือนนี้" value={c.certsMtd} href="/admin/certificates" />
      </div>
      <p className="text-uism text-foreground-subtle">
        ตัวเลข &quot;วันนี้&quot; นับจากเที่ยงคืนตามเครื่อง server
      </p>
    </section>
  );
}

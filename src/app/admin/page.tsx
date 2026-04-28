import Link from "next/link";
import { getAdminDashboardCounts } from "@/server/repos/admin-dashboard";

interface CardProps {
  label: string;
  value: number;
  href?: string;
  hint?: string;
}

function Card({ label, value, href, hint }: CardProps) {
  const inner = (
    <div className="flex h-full flex-col gap-1 rounded-md border border-border p-4 transition hover:bg-muted/40">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// Avoid the static cache — counts must reflect what the admin sees right now.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const c = await getAdminDashboardCounts();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">แผงควบคุม</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Slip รอตรวจ"
          value={c.slipsSubmitted}
          href="/admin/slips?status=submitted"
        />
        <Card
          label="อนุมัติวันนี้"
          value={c.slipsAcceptedToday}
          href="/admin/slips?status=accepted"
        />
        <Card
          label="ปฏิเสธวันนี้"
          value={c.slipsRejectedToday}
          href="/admin/slips?status=rejected"
        />
        <Card label="นักเรียน active" value={c.enrollmentsActive} />
        <Card
          label="คอร์ส published"
          value={c.coursesPublished}
          href="/admin/courses"
        />
        <Card
          label="รายได้เดือนนี้"
          value={c.revenueMtd}
          hint="บาท"
        />
        <Card
          label="ใบประกาศเดือนนี้"
          value={c.certsMtd}
          href="/admin/certificates"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        ตัวเลข &quot;วันนี้&quot; นับจากเที่ยงคืนตามเครื่อง server
      </p>
    </section>
  );
}

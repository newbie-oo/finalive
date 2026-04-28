import Link from "next/link";
import { GraduationCap, PlayCircle } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/auth-session";
import { listAccountPendings, listAccountEnrollments } from "@/server/repos/account";
import { formatTHB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import {
  PENDING_STATUS_LABEL,
  isActionable,
  type PendingStatus,
} from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "success" | "warning" | "review" | "destructive" | "neutral"> = {
  paid: "success",
  waiting_slip: "warning",
  under_review: "review",
  rejected: "destructive",
  expired: "neutral",
  cancelled: "neutral",
};

export default async function EnrollmentsPage() {
  const { user } = await requireSession();
  const [pendings, enrollments] = await Promise.all([
    listAccountPendings(user.id),
    listAccountEnrollments(user.id),
  ]);

  // Merge: show enrollments + pending payments that are NOT already paid (those have an enrollment).
  const enrolledCourseSlugs = new Set(enrollments.map((e) => e.courseSlug));
  const actionablePendings = pendings.filter(
    (p) => !enrolledCourseSlugs.has(p.courseSlug) && isActionable(p.status),
  );

  const hasContent = enrollments.length > 0 || actionablePendings.length > 0;

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-h1">คอร์สของฉัน</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
          รายการคอร์สที่กำลังลงทะเบียน รอตรวจสลิป และที่เรียนได้แล้ว
        </p>
      </header>

      {!hasContent ? (
        <EmptyState
          icon={<GraduationCap size={28} weight="duotone" />}
          title="ยังไม่มีคอร์ส"
          description="เลือกคอร์สแรกแล้วเริ่มเรียนได้เลย"
          action={
            <Button asChild variant="accent">
              <Link href="/courses">เลือกคอร์ส</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Active enrollments */}
          {enrollments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-h4 text-(--foreground-muted)">พร้อมเรียน</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {enrollments.map((e) => (
                  <li key={e.enrollmentId}>
                    <Card className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-h4">{e.courseTitle}</h3>
                        <StatusChip tone="success">พร้อมเรียน</StatusChip>
                      </div>
                      <p className="text-uism text-(--foreground-muted)">
                        {e.source === "free_course" ? (
                          <span className="text-success font-medium">ฟรี</span>
                        ) : (
                          <span className="num">{formatTHB(e.priceAtPurchase)}</span>
                        )}
                      </p>
                      <div className="mt-auto pt-2">
                        <Button asChild variant="primary" size="md">
                          <Link href={`/learn/${e.courseSlug}`}>
                            <PlayCircle size={16} weight="fill" /> เริ่มเรียน
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pending payments (not yet enrolled) */}
          {actionablePendings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-h4 text-(--foreground-muted)">รอดำเนินการ</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {actionablePendings.map((p) => {
                  const tone = statusTone[p.status] ?? "neutral";
                  return (
                    <li key={p.pendingId}>
                      <Card className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-h4">{p.courseTitle}</h3>
                          <StatusChip tone={tone}>
                            {PENDING_STATUS_LABEL[p.status as PendingStatus] ?? p.status}
                          </StatusChip>
                        </div>
                        <p className="text-uism text-(--foreground-muted)">
                          <span className="num">{formatTHB(p.amount)}</span> · เลขอ้างอิง{" "}
                          <span className="mono">{p.refCode}</span>
                        </p>
                        <div className="mt-auto pt-2">
                          <Button asChild variant="secondary" size="md">
                            <Link href={`/checkout/${p.pendingId}`}>ดูรายละเอียด</Link>
                          </Button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

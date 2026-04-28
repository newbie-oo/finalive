import Link from "next/link";
import { GraduationCap, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/auth-session";
import { listAccountPendings } from "@/server/repos/account";
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
  const pendings = await listAccountPendings(user.id);

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-h1">คอร์สของฉัน</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
          รายการคอร์สที่กำลังลงทะเบียน รอตรวจสลิป และที่เรียนได้แล้ว
        </p>
      </header>

      {pendings.length === 0 ? (
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
        <ul className="grid gap-4 md:grid-cols-2">
          {pendings.map((p) => {
            const isPaid = p.status === "paid";
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
                    {isPaid ? (
                      <Button asChild variant="primary" size="md">
                        <Link href={`/learn/${p.courseSlug}`}>
                          เริ่มเรียน <ArrowRight size={16} weight="bold" />
                        </Link>
                      </Button>
                    ) : isActionable(p.status) ? (
                      <Button asChild variant="secondary" size="md">
                        <Link href={`/checkout/${p.pendingId}`}>ดูรายละเอียด</Link>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import Link from "next/link";
import { requireSession } from "@/server/auth-session";
import { listAccountPendings } from "@/server/repos/account";
import { formatTHB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PENDING_STATUS_LABEL,
  isActionable,
  type PendingStatus,
} from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

export default async function EnrollmentsPage() {
  const { user } = await requireSession();
  const pendings = await listAccountPendings(user.id);

  return (
    <section>
      <h1 className="mb-1 text-xl font-semibold">คอร์สของฉัน</h1>
      <p className="mb-6 text-xs text-muted-foreground">
        รายการคอร์สที่กำลังลงทะเบียน รอตรวจสลิป และที่เรียนได้แล้ว
      </p>

      {pendings.length === 0 ? (
        <EmptyState
          icon="📚"
          title="ยังไม่มีคอร์ส"
          description="เลือกคอร์สแรกแล้วเริ่มเรียนได้เลย"
          action={
            <Button asChild>
              <Link href="/courses">เลือกคอร์ส</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {pendings.map((p) => {
            const isPaid = p.status === "paid";
            return (
              <li
                key={p.pendingId}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.courseTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {PENDING_STATUS_LABEL[p.status as PendingStatus] ?? p.status} · {formatTHB(p.amount)} ·{" "}
                    <span className="font-mono">{p.refCode}</span>
                  </p>
                </div>
                {isPaid ? (
                  <Link
                    href={`/learn/${p.courseSlug}`}
                    className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    เริ่มเรียน →
                  </Link>
                ) : isActionable(p.status) ? (
                  <Link
                    href={`/checkout/${p.pendingId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    ดูรายละเอียด
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

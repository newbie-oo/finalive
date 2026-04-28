import Link from "next/link";
import { requireSession } from "@/server/auth-session";
import { listAccountPendings } from "@/server/repos/account";

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "รอชำระเงิน",
  slip_submitted: "รอ admin ตรวจ",
  paid: "พร้อมเรียน",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};

const fmt = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export const dynamic = "force-dynamic";

export default async function EnrollmentsPage() {
  const { user } = await requireSession("/login");
  const pendings = await listAccountPendings(user.id);

  return (
    <section>
      <h1 className="mb-1 text-xl font-semibold">คอร์สของฉัน</h1>
      <p className="mb-6 text-xs text-muted-foreground">
        รายการคอร์สที่กำลังลงทะเบียน รอตรวจสลิป และที่เรียนได้แล้ว
      </p>

      {pendings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          ยังไม่มีรายการ — <Link href="/courses" className="text-primary hover:underline">เลือกคอร์ส</Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {pendings.map((p) => (
            <li
              key={p.pendingId}
              className="flex items-center justify-between rounded border border-border bg-card p-3 text-sm"
            >
              <div>
                <p className="font-medium">{p.courseTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS_LABEL[p.status] ?? p.status} · {fmt.format(Number(p.amount))} ·{" "}
                  <span className="font-mono">{p.refCode}</span>
                </p>
              </div>
              {p.status === "awaiting_payment" || p.status === "slip_submitted" ? (
                <Link
                  href={`/checkout/${p.pendingId}`}
                  className="text-xs text-primary hover:underline"
                >
                  ดูรายละเอียด
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

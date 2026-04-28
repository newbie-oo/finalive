import Link from "next/link";
import { listPendingSlips, type SlipQueueStatus } from "@/server/repos/slip";
import type { SearchParams } from "@/lib/pagination";
import { SlipQueue } from "@/components/admin/slip-queue";

const STATUS_OPTIONS: Array<{ value: SlipQueueStatus; label: string }> = [
  { value: "submitted", label: "รอตรวจ" },
  { value: "accepted", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "all", label: "ทั้งหมด" },
];

function pickStatus(raw: string | string[] | undefined): SlipQueueStatus {
  if (raw === "accepted" || raw === "rejected" || raw === "all") return raw;
  return "submitted";
}

function pickString(raw: string | string[] | undefined): string | undefined {
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

export default async function AdminSlipsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = pickStatus(sp.status);
  const selectedId = pickString(sp.selected);

  // Pre-warm cache on the server. The client query takes over after hydration.
  await listPendingSlips({ status, per_page: 50 });

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1">คิวตรวจสลิป</h1>
          <p className="mt-1 text-body text-(--foreground-muted)">
            ใช้คีย์ลัด: <kbd className="mono rounded border border-(--border) px-1 text-uism">A</kbd> ยอมรับ ·{" "}
            <kbd className="mono rounded border border-(--border) px-1 text-uism">R</kbd> ปฏิเสธ ·{" "}
            <kbd className="mono rounded border border-(--border) px-1 text-uism">S</kbd> ข้าม
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-uism" aria-label="ตัวกรองสถานะสลิป">
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.value === status;
            return (
              <Link
                key={opt.value}
                href={`/admin/slips?status=${opt.value}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 transition-colors ${
                  active
                    ? "border-(--primary) bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-semibold text-(--primary)"
                    : "border-(--border) text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <SlipQueue status={status} initialSelectedId={selectedId} />
    </section>
  );
}

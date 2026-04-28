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
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">คิวตรวจสลิป</h1>
        <nav className="flex gap-2 text-sm">
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.value === status;
            return (
              <Link
                key={opt.value}
                href={`/admin/slips?status=${opt.value}`}
                className={`rounded-md border border-border px-2 py-1 ${
                  active ? "bg-foreground text-background" : "hover:bg-muted"
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

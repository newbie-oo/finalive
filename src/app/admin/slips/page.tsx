import Link from "next/link";
import { listPendingSlips, type SlipQueueStatus } from "@/server/repos/slip";
import { formatTHB } from "@/lib/format";
import type { SearchParams } from "@/lib/pagination";
import { SlipList } from "@/components/admin/slip-list";
import { SlipImageViewer } from "@/components/admin/slip-image-viewer";

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

  // SSR the first page so the detail panel can render server-side without
  // waiting for the client query. The client SlipList re-fetches and takes
  // over polling once hydrated.
  const initial = await listPendingSlips({ status, per_page: 50 });
  const selected =
    initial.data.find((r) => r.id === selectedId) ?? initial.data[0] ?? null;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Slip queue</h1>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <SlipList
          status={status}
          selectedId={selectedId}
          initialFirstId={initial.data[0]?.id ?? null}
        />

        <div className="rounded-md border border-border p-4">
          {selected ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{selected.refCode}</h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">คอร์ส</dt>
                <dd>{selected.courseTitle}</dd>
                <dt className="text-muted-foreground">ราคา</dt>
                <dd>{formatTHB(selected.expectedAmount)}</dd>
                <dt className="text-muted-foreground">นักเรียนแจ้งยอด</dt>
                <dd>
                  {selected.reportedAmount ? formatTHB(selected.reportedAmount) : "—"}
                </dd>
                <dt className="text-muted-foreground">นักเรียน</dt>
                <dd className="font-mono text-xs">{selected.studentUserId}</dd>
                <dt className="text-muted-foreground">ส่งเมื่อ</dt>
                <dd>{selected.createdAt.toLocaleString("th-TH")}</dd>
                <dt className="text-muted-foreground">สถานะ</dt>
                <dd>{selected.status}</dd>
              </dl>
              <SlipImageViewer slipId={selected.id} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">เลือก slip ทางซ้ายเพื่อดูรายละเอียด</p>
          )}
        </div>
      </div>
    </section>
  );
}

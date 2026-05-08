import { listPendingSlips, type SlipQueueStatus } from "@/server/repos/slip";
import type { SearchParams } from "@/lib/pagination";
import { SlipQueue } from "@/components/admin/slip-queue";
import { SlipQueueRefreshButton } from "@/components/admin/slip-queue-refresh-button";
import { SlipStatusTabs } from "@/components/admin/slip-status-tabs";

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
          <p className="mt-1 text-body text-muted-foreground">
            ใช้คีย์ลัด:{" "}
            <kbd className="mono rounded-sm border border-border px-1 text-uism">
              A
            </kbd>{" "}
            ยอมรับ ·{" "}
            <kbd className="mono rounded-sm border border-border px-1 text-uism">
              R
            </kbd>{" "}
            ปฏิเสธ ·{" "}
            <kbd className="mono rounded-sm border border-border px-1 text-uism">
              S
            </kbd>{" "}
            ข้าม
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlipQueueRefreshButton />
          <SlipStatusTabs status={status} />
        </div>
      </header>

      <SlipQueue status={status} initialSelectedId={selectedId} />
    </section>
  );
}

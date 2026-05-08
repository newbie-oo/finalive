"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SlipQueueStatus } from "@/server/repos/slip";

const STATUS_OPTIONS: Array<{ value: SlipQueueStatus; label: string }> = [
  { value: "submitted", label: "รอตรวจ" },
  { value: "accepted", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "all", label: "ทั้งหมด" },
];

export function SlipStatusTabs({ status }: { status: SlipQueueStatus }) {
  const router = useRouter();
  return (
    <Tabs
      value={status}
      onValueChange={(v) => router.push(`/admin/slips?status=${v}`)}
      aria-label="Slip status filter"
    >
      <TabsList>
        {STATUS_OPTIONS.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

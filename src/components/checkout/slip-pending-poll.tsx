"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Hourglass } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface SlipPendingPollProps {
  pendingId: string;
  /** Slug fallback rendered server-side; keeps the page useful even if the
   * status endpoint flips before the route is loaded. */
  fallbackCourseSlug: string;
}

interface StatusResponse {
  status: string;
  courseSlug: string;
  refCode: string;
  amount: string;
}

async function fetchStatus(pendingId: string): Promise<StatusResponse> {
  const res = await fetch(`/api/checkout/${pendingId}/status`, {
    cache: "no-store",
  });
  if (res.status === 410 || res.status === 404) {
    throw Object.assign(new Error("gone"), { code: "gone" });
  }
  if (!res.ok) throw new Error(`status_${res.status}`);
  return (await res.json()) as StatusResponse;
}

export function SlipPendingPoll({
  pendingId,
  fallbackCourseSlug,
}: SlipPendingPollProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);

  const query = useQuery<StatusResponse, Error & { code?: string }>({
    queryKey: ["pending-status", pendingId],
    queryFn: () => fetchStatus(pendingId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (redirectedRef.current) return;
    if (query.data?.status === "paid") {
      redirectedRef.current = true;
      router.replace(`/learn/${query.data.courseSlug ?? fallbackCourseSlug}`);
      router.refresh();
    }
  }, [query.data, router, fallbackCourseSlug]);

  const status = query.data?.status ?? "slip_submitted";
  const isExpired = status === "expired" || status === "cancelled";
  const isPaid = status === "paid";

  if (isPaid) {
    return (
      <Card className="border-success bg-success-bg">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} weight="fill" className="text-success" />
          <div className="text-body text-success-foreground">
            <p className="font-medium">ตรวจสอบเรียบร้อย พร้อมเรียนแล้ว</p>
            <p className="mt-1 text-uism">กำลังพาคุณไปยังหน้าคอร์ส…</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="border-destructive">
        <div className="space-y-2">
          <p className="font-medium text-(--destructive-fg)">รายการนี้หมดอายุ</p>
          <p className="text-body text-(--foreground-muted)">
            กรุณากลับไปหน้าคอร์สและเริ่มใหม่อีกครั้ง
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-success bg-success-bg">
      <div className="flex items-start gap-3">
        <Hourglass
          size={24}
          weight="duotone"
          className="text-success shrink-0 motion-safe:animate-pulse"
        />
        <div className="text-body text-success-foreground">
          <p className="font-medium">ส่งสลิปแล้ว — รอ admin ตรวจสอบ</p>
          <p className="mt-1 text-uism">
            ปกติใช้เวลา 1–2 ชม. เมื่อตรวจเสร็จระบบจะพาคุณไปหน้าคอร์สอัตโนมัติ
            ไม่ต้องรีเฟรชเอง
          </p>
        </div>
      </div>
    </Card>
  );
}

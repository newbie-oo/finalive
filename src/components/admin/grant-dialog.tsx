"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { grantCourseAction } from "@/server/actions/admin-grant";

interface GrantDialogProps {
  studentUserId: string;
  courses: Array<{ id: string; title: string }>;
}

const REASONS = [
  { value: "promo", label: "โปรโมชัน" },
  { value: "gift", label: "ของขวัญ" },
  { value: "comp", label: "ชดเชย" },
  { value: "refund_replacement", label: "คืนเงิน/เปลี่ยนคอร์ส" },
  { value: "other", label: "อื่นๆ" },
];

export function GrantDialog({ studentUserId, courses }: GrantDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleGrant() {
    if (!courseId || !reason) {
      toast.error("กรุณาเลือกคอร์สและเหตุผล");
      return;
    }

    startTransition(async () => {
      const result = await grantCourseAction({
        studentUserId,
        courseId,
        reason: reason as
          | "promo"
          | "gift"
          | "comp"
          | "refund_replacement"
          | "other",
        note: note || undefined,
      });
      if (result.ok) {
        toast.success("ให้สิทธิ์สำเร็จ");
        setOpen(false);
        router.refresh();
      } else if (result.error === "already_enrolled") {
        toast.error("ผู้ใช้ลงทะเบียนคอร์สนี้อยู่แล้ว");
      } else {
        toast.error("ให้สิทธิ์ไม่สำเร็จ");
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + ให้สิทธิ์คอร์ส
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-sm border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-medium">ให้สิทธิ์คอร์ส</h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">คอร์ส</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">เลือกคอร์ส</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">เหตุผล</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">เลือกเหตุผล</option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  หมายเหตุ (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
                  placeholder="หมายเหตุ"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button size="sm" onClick={handleGrant} disabled={pending}>
                {pending ? "กำลังให้สิทธิ์…" : "ให้สิทธิ์"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

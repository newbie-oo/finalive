"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { toast } from "sonner";
import { publishCourseAction } from "@/server/actions/admin-publish";

interface PublishButtonProps {
  courseId: string;
  currentStatus: string;
}

export function PublishButton({ courseId, currentStatus }: PublishButtonProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (currentStatus === "published") {
    return <StatusChip tone="success">เผยแพร่แล้ว</StatusChip>;
  }

  function handlePublish() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("courseId", courseId);
      const result = await publishCourseAction(formData);
      if (result.ok) {
        toast.success("เผยแพร่คอร์สสำเร็จ");
        setShowDialog(false);
        router.refresh();
      } else if (result.error === "validation_failed" && "errors" in result) {
        setErrors((result as { errors: string[] }).errors);
        setShowDialog(true);
      } else {
        toast.error("เผยแพร่ไม่สำเร็จ");
      }
    });
  }

  return (
    <>
      <Button size="md" variant="primary" onClick={handlePublish} disabled={pending}>
        {pending ? "กำลังตรวจสอบ…" : "เผยแพร่คอร์ส"}
      </Button>

      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-error-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
        >
          <Card className="w-full max-w-md shadow-(--shadow-lg)">
            <h3 id="publish-error-title" className="text-h3">ไม่สามารถเผยแพร่ได้</h3>
            <p className="mt-1 text-body text-(--foreground-muted)">
              กรุณาแก้ไขข้อผิดพลาดต่อไปนี้ก่อนเผยแพร่
            </p>
            <ul className="mt-3 list-inside list-disc text-body text-destructive">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <Button size="md" variant="ghost" onClick={() => setShowDialog(false)}>
                ปิด
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

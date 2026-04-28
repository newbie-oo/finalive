"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    return (
      <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
        เผยแพร่แล้ว
      </span>
    );
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
      <Button size="sm" variant="default" onClick={handlePublish} disabled={pending}>
        {pending ? "กำลังตรวจสอบ…" : "เผยแพร่คอร์ส"}
      </Button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-medium">ไม่สามารถเผยแพร่ได้</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              กรุณาแก้ไขข้อผิดพลาดต่อไปนี้ก่อนเผยแพร่
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-destructive">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowDialog(false)}>
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

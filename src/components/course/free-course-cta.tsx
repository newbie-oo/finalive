"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { enrollFreeCourse } from "@/server/actions/enroll-free";

interface FreeCourseCtaProps {
  courseSlug: string;
}

export function FreeCourseCta({ courseSlug }: FreeCourseCtaProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const autoEnrollRequested = params.get("autoEnroll") === "1";
  const userId = session?.user?.id ?? null;

  const enroll = useCallback(async () => {
    setLoading(true);
    try {
      const result = await enrollFreeCourse(courseSlug);
      if (result.ok) {
        toast.success("ลงทะเบียนสำเร็จ — กำลังพาเข้าคอร์ส");
        router.push(`/learn/${result.courseSlug}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ลงทะเบียนไม่สำเร็จ";
      toast.error(msg);
      setLoading(false);
    }
  }, [courseSlug, router]);

  useEffect(() => {
    if (!autoEnrollRequested) return;
    if (!userId) return;
    void enroll();
  }, [autoEnrollRequested, userId, enroll]);

  const handleClick = () => {
    if (isPending) return;
    if (!session?.user) {
      const next = `/courses/${courseSlug}?autoEnroll=1`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    void enroll();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading || isPending}
      variant="primary"
      size="lg"
      className="w-full"
    >
      {loading ? "กำลังดำเนินการ..." : "เริ่มเรียน"}
    </Button>
  );
}

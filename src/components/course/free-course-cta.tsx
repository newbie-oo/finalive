"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enrollFreeCourse } from "@/server/actions/enroll-free";

interface FreeCourseCtaProps {
  courseSlug: string;
}

export function FreeCourseCta({ courseSlug }: FreeCourseCtaProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await enrollFreeCourse(courseSlug);
      if (result.ok) {
        toast.success("ลงทะเบียนสำเร็จ");
        router.push(`/learn/${result.courseSlug}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ลงทะเบียนไม่สำเร็จ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="primary"
      size="lg"
      className="w-full"
    >
      {loading ? "กำลังดำเนินการ..." : "เริ่มเรียน"}
    </Button>
  );
}

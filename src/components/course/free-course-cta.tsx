"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { enrollFreeCourse } from "@/server/actions/enroll-free";

interface FreeCourseCtaProps {
  courseSlug: string;
}

/**
 * "เริ่มเรียน" CTA on a free course.
 *
 * Two paths:
 *  - Authenticated → enroll (idempotent server action) → /learn/[slug]
 *  - Not authenticated → /login?next=/courses/[slug]?autoEnroll=1
 *    On return, the autoEnroll query triggers enrollment automatically so the
 *    student doesn't have to click again. This was the #1 reported friction:
 *    silent redirect to login with no return path.
 */
export function FreeCourseCta({ courseSlug }: FreeCourseCtaProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const autoEnrollRequested = params.get("autoEnroll") === "1";

  async function enroll() {
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
  }

  // Auto-enroll on return from login. The rule "no setState in effect" is
  // disabled here because the trigger genuinely is a transition into a new
  // session — we can't move it to render without infinite loops, and we
  // can't move it earlier because the session arrives async.
  useEffect(() => {
    if (!autoEnrollRequested) return;
    if (!session?.user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void enroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnrollRequested, session?.user]);

  const handleClick = () => {
    if (isPending) return;
    if (!session?.user) {
      const next = `/courses/${courseSlug}?autoEnroll=1`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setLoading(true);
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

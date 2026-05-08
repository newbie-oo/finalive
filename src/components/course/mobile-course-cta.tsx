"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MobileCourseCtaProps {
  courseSlug: string;
  price: string;
  isFree: boolean;
  isEnrolled: boolean;
}

export function MobileCourseCta({
  courseSlug,
  price,
  isFree,
  isEnrolled,
}: MobileCourseCtaProps) {
  if (isEnrolled) return null;

  return (
    <div
      data-testid="mobile-course-cta"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-uism text-muted-foreground">ราคา</div>
          <div
            className={`num text-h4 font-bold ${isFree ? "text-success" : "text-foreground"}`}
          >
            {price}
          </div>
        </div>
        {isFree ? (
          <Button asChild variant="primary" size="lg" className="shrink-0">
            <Link href={`/learn/${courseSlug}`}>เรียนฟรีเลย</Link>
          </Button>
        ) : (
          <form action="/checkout/start" method="post" className="shrink-0">
            <input type="hidden" name="courseSlug" value={courseSlug} />
            <Button type="submit" variant="accent" size="lg">
              ลงทะเบียนเรียน
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

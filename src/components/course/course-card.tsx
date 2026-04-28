import Link from "next/link";
import type { PublicCourseSummary } from "@/server/repos/course";

const fmt = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export function CourseCard({ course }: { course: PublicCourseSummary }) {
  const price = course.isFree ? "ฟรี" : fmt.format(Number(course.price));
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="aspect-video w-full rounded bg-muted" aria-hidden />
      <h3 className="mt-3 text-base font-semibold group-hover:underline">{course.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
      <span className="mt-3 text-sm font-medium">{price}</span>
    </Link>
  );
}

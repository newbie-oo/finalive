import Image from "next/image";
import Link from "next/link";
import type { PublicCourseSummary } from "@/server/repos/course";
import { formatTHB } from "@/lib/format";

export function CourseCard({ course }: { course: PublicCourseSummary }) {
  const price = course.isFree ? "ฟรี" : formatTHB(course.price);
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded bg-muted" aria-hidden>
        {course.coverUrl ? (
          <Image
            src={course.coverUrl}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            ไม่มีรูปปก
          </div>
        )}
        {course.isFree && (
          <span className="absolute left-2 top-2 rounded bg-success px-2 py-0.5 text-xs font-medium text-success-foreground">
            ฟรี
          </span>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold group-hover:underline">{course.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
      <span className="mt-3 text-sm font-medium">{price}</span>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="aspect-video w-full rounded bg-muted animate-pulse" aria-hidden />
      <div className="mt-3 h-5 w-3/4 rounded bg-muted animate-pulse" />
      <div className="mt-2 h-4 w-full rounded bg-muted animate-pulse" />
      <div className="mt-1 h-4 w-2/3 rounded bg-muted animate-pulse" />
      <div className="mt-3 h-4 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}

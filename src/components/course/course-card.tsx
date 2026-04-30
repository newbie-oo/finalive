import Image from "next/image";
import Link from "next/link";
import { Users } from "@phosphor-icons/react/dist/ssr";
import type { PublicCourseSummary } from "@/server/repos/course";
import { formatTHB } from "@/lib/format";
import { StatusChip } from "@/components/ui/status-chip";

export function CourseCard({ course }: { course: PublicCourseSummary }) {
  const price = course.isFree ? "ฟรี" : formatTHB(course.price);
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-(--shadow-sm) transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-(--surface-muted)" aria-hidden>
        {course.coverUrl ? (
          <Image
            src={course.coverUrl}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <CoverFallback title={course.title} />
        )}
        {course.isFree && (
          <span className="absolute left-3 top-3">
            <StatusChip tone="success">ฟรี</StatusChip>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-h4 text-(--foreground) group-hover:text-(--primary)">{course.title}</h3>
        <p className="line-clamp-2 text-body text-(--foreground-muted)">{course.summary}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="num text-h4 font-semibold text-(--foreground)">{price}</span>
          <span className="inline-flex items-center gap-1 text-uism text-(--foreground-muted)">
            <Users size={14} />
            <span className="num">{course.enrollmentCount.toLocaleString("th-TH")}</span> ผู้เรียน
          </span>
        </div>
      </div>
    </Link>
  );
}

function CoverFallback({ title }: { title: string }) {
  // Indigo→violet gradient with the course's leading Thai/Latin character. Per
  // DESIGN.md §5.4 — replaces the bare "ไม่มีรูปปก" placeholder so cards never
  // look broken when a cover hasn't been uploaded.
  const initial = (title.trim().charAt(0) || "F").toUpperCase();
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-linear-to-br from-[#312E81] to-[#1E1B4B]">
      <div
        aria-hidden
        className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-[#F97316]/20 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#818CF8]/30 blur-2xl"
      />
      <span className="relative font-semibold text-white" style={{ fontSize: 56, letterSpacing: "-0.02em" }}>
        {initial}
      </span>
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-(--border) bg-(--surface)">
      <div className="aspect-video w-full animate-pulse bg-(--surface-muted)" aria-hidden />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="h-4 w-full animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-(--surface-muted)" />
        <div className="mt-2 h-5 w-24 animate-pulse rounded-md bg-(--surface-muted)" />
      </div>
    </div>
  );
}

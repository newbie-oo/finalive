"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface SidebarLesson {
  id: string;
  title: string;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
}

interface SidebarModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: SidebarLesson[];
}

interface CurriculumSidebarProps {
  courseSlug: string;
  modules: SidebarModule[];
  progress: Array<{ lessonId: string; status: string }>;
  isEnrolled: boolean;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "▶";
    default:
      return "○";
  }
}

export function CurriculumSidebar({
  courseSlug,
  modules,
  progress,
  isEnrolled,
}: CurriculumSidebarProps) {
  const params = useParams();
  const activeLessonId = params.lessonId as string;
  const progressMap = new Map(progress.map((p) => [p.lessonId, p.status]));

  return (
    <nav className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">บทเรียน</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {modules.map((mod) => (
          <div key={mod.id} className="mb-3">
            <h3 className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {mod.title}
            </h3>
            <ul className="space-y-0.5">
              {mod.lessons.map((les) => {
                const isActive = les.id === activeLessonId;
                const locked = !isEnrolled && !les.isPreview && !les.isFree;
                const stat = progressMap.get(les.id) ?? "not_started";
                return (
                  <li key={les.id}>
                    <Link
                      href={locked ? `#` : `/learn/${courseSlug}/${les.id}`}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : locked
                            ? "text-muted-foreground/50"
                            : "hover:bg-muted"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="w-4 text-center text-xs">
                        {locked ? "🔒" : statusIcon(stat)}
                      </span>
                      <span className="flex-1 truncate">{les.title}</span>
                      {les.durationSeconds ? (
                        <span className="text-xs text-muted-foreground">
                          {fmtDuration(les.durationSeconds)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

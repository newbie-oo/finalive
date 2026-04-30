"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  PlayCircle,
  Circle,
  LockSimple,
  X,
  Exam,
} from "@phosphor-icons/react";
import { LessonAccessBadge } from "@/components/course/lesson-access-badge";

interface SidebarLesson {
  id: string;
  title: string;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
  quizId: string | null;
}

export interface SidebarModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: SidebarLesson[];
}

interface CurriculumSidebarProps {
  courseSlug: string;
  modules: SidebarModule[];
  progress: Array<{ lessonId: string; status: string }>;
  /** Latest-attempt pass status, keyed by quizId. Quizzes the user has not
   * attempted are absent from the map (rendered with the default Exam icon). */
  passedQuizIds?: ReadonlyMap<string, boolean>;
  isEnrolled: boolean;
  isAdmin?: boolean;
  totalLessons?: number;
  onClose?: () => void;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusIcon({ status, locked }: { status: string; locked: boolean }) {
  if (locked) return <LockSimple size={14} className="text-foreground-subtle" />;
  if (status === "completed") return <CheckCircle size={14} weight="fill" className="text-success" />;
  if (status === "in_progress") return <PlayCircle size={14} weight="fill" className="text-primary" />;
  return <Circle size={14} className="text-foreground-subtle" />;
}

export function CurriculumSidebar({
  courseSlug,
  modules,
  progress,
  passedQuizIds,
  isEnrolled,
  isAdmin = false,
  totalLessons,
  onClose,
}: CurriculumSidebarProps) {
  const params = useParams();
  const activeLessonId = params.lessonId as string;
  const progressMap = new Map(progress.map((p) => [p.lessonId, p.status]));

  const lessonCount = totalLessons ?? modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <nav className="flex h-full flex-col bg-(--surface)">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--border) px-5 py-4">
        <div>
          <h2 className="text-h4" style={{ margin: 0 }}>หลักสูตร</h2>
          <div className="text-caption text-(--foreground-muted)">
            <span className="num">{modules.length}</span> บท ·{" "}
            <span className="num">{lessonCount}</span> บทเรียน
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto p-3">
        {modules.map((mod) => (
          <div key={mod.id} className="mb-4">
            <h3 className="px-2 py-1.5 text-caption font-semibold uppercase tracking-wide text-foreground-subtle">
              {mod.title}
            </h3>
            <ul className="space-y-0.5">
              {mod.lessons.map((les) => {
                const isActive = les.id === activeLessonId;
                const locked = !isAdmin && !isEnrolled && !les.isPreview && !les.isFree;
                const stat = progressMap.get(les.id) ?? "not_started";
                const baseClass =
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-uism transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)";
                const stateClass = isActive
                  ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-semibold text-(--primary)"
                  : locked
                    ? "cursor-not-allowed text-foreground-subtle"
                    : "text-(--foreground) hover:bg-(--surface-muted)";
                const inner = (
                  <>
                    <span aria-hidden="true" className="inline-flex w-4 justify-center">
                      <StatusIcon status={stat} locked={locked} />
                    </span>
                    <span className="flex-1 truncate">
                      {locked ? <span className="sr-only">ล็อก: </span> : null}
                      {les.title}
                    </span>
                    <LessonAccessBadge
                      isPreview={les.isPreview}
                      isFree={les.isFree}
                      size="sm"
                    />
                    {les.durationSeconds ? (
                      <span className="num text-caption text-foreground-subtle">
                        {fmtDuration(les.durationSeconds)}
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={les.id}>
                    {locked ? (
                      <button
                        type="button"
                        aria-disabled="true"
                        title="ลงทะเบียนคอร์สเพื่อปลดล็อกบทเรียนนี้"
                        onClick={(e) => e.preventDefault()}
                        className={`${baseClass} ${stateClass}`}
                      >
                        {inner}
                      </button>
                    ) : (
                      <Link
                        href={`/learn/${courseSlug}/${les.id}`}
                        className={`${baseClass} ${stateClass}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={onClose}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
              {/* Module quiz link */}
              {(() => {
                const quizLesson = mod.lessons.find((l) => l.quizId);
                if (!quizLesson || !quizLesson.quizId) return null;
                const _locked = !isAdmin && !isEnrolled && !quizLesson.isPreview && !quizLesson.isFree;
                const passed = passedQuizIds?.get(quizLesson.quizId);
                return (
                  <li>
                    <Link
                      href={`/learn/${courseSlug}/quiz/${quizLesson.quizId}`}
                      className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-uism text-(--foreground) transition-colors hover:bg-(--surface-muted)"
                      onClick={onClose}
                    >
                      {passed === true ? (
                        <CheckCircle
                          size={14}
                          weight="fill"
                          className="text-success shrink-0"
                          aria-label="ผ่านแบบทดสอบ"
                        />
                      ) : (
                        <Exam size={14} className="text-primary shrink-0" />
                      )}
                      <span className="flex-1 truncate">
                        แบบทดสอบท้ายโมดูล
                        {passed === false ? (
                          <span className="ml-2 text-caption text-(--destructive-fg)">
                            ลองอีกครั้ง
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })()}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

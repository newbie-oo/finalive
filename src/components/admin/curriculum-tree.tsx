"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createModuleAction, createLessonAction } from "@/server/actions/admin-curriculum";
import type { AdminCurriculumModule, AdminCurriculumLesson } from "@/server/repos/admin-course";

interface CurriculumTreeProps {
  courseId: string;
  modules: AdminCurriculumModule[];
}

export function CurriculumTree({ courseId, modules }: CurriculumTreeProps) {
  const router = useRouter();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(modules.map((m) => m.id)),
  );
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedLesson = modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId);

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  async function handleCreateModule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createModuleAction(formData);
      if (result.ok) {
        toast.success("สร้างโมดูลสำเร็จ");
        setAddingModule(false);
        router.refresh();
      } else {
        toast.error("สร้างโมดูลไม่สำเร็จ");
      }
    });
  }

  async function handleCreateLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createLessonAction(formData);
      if (result.ok) {
        toast.success("สร้างบทเรียนสำเร็จ");
        setAddingLessonModuleId(null);
        router.refresh();
      } else {
        toast.error("สร้างบทเรียนไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left: Tree */}
      <div className="flex w-80 flex-col border-r border-border pr-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">เนื้อหา</h2>
          <Button size="xs" variant="outline" onClick={() => setAddingModule(true)} disabled={pending}>
            + โมดูล
          </Button>
        </div>

        {addingModule && (
          <form onSubmit={handleCreateModule} className="mb-3 flex gap-2">
            <input type="hidden" name="courseId" value={courseId} />
            <input
              name="title"
              placeholder="ชื่อโมดูล"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
              required
              autoFocus
            />
            <Button size="xs" type="submit" disabled={pending}>
              บันทึก
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setAddingModule(false)} type="button">
              ยกเลิก
            </Button>
          </form>
        )}

        <div className="flex-1 overflow-auto space-y-2">
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีโมดูล</p>
          )}
          {modules.map((mod) => (
            <div key={mod.id}>
              <button
                onClick={() => toggleModule(mod.id)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <span>{mod.title}</span>
                <span className="text-xs text-muted-foreground">
                  {expandedModules.has(mod.id) ? "▾" : "▸"}
                </span>
              </button>

              {expandedModules.has(mod.id) && (
                <div className="mt-1 ml-3 space-y-0.5 border-l border-border pl-2">
                  {mod.lessons.map((ls) => (
                    <button
                      key={ls.id}
                      onClick={() => setSelectedLessonId(ls.id)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-sm ${
                        selectedLessonId === ls.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{ls.title}</span>
                      <Link
                        href={`/admin/courses/${courseId}/lessons/${ls.id}`}
                        className="ml-2 text-xs text-primary hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        แก้ไข
                      </Link>
                    </button>
                  ))}

                  {addingLessonModuleId === mod.id ? (
                    <form onSubmit={handleCreateLesson} className="flex gap-2 py-1">
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="moduleId" value={mod.id} />
                      <input
                        name="title"
                        placeholder="ชื่อบทเรียน"
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                        required
                        autoFocus
                      />
                      <Button size="xs" type="submit" disabled={pending}>
                        บันทึก
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setAddingLessonModuleId(null)}
                        type="button"
                      >
                        ยกเลิก
                      </Button>
                    </form>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="w-full justify-start text-xs text-muted-foreground"
                      onClick={() => setAddingLessonModuleId(mod.id)}
                      disabled={pending}
                    >
                      + เพิ่มบทเรียน
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-auto">
        {selectedLesson ? (
          <LessonDetailPanel courseId={courseId} lesson={selectedLesson} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            เลือกบทเรียนเพื่อดูรายละเอียด
          </div>
        )}
      </div>
    </div>
  );
}

function LessonDetailPanel({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: AdminCurriculumLesson;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{lesson.title}</h3>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>แก้ไขบทเรียน →</Link>
        </Button>
      </div>

      <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">ความยาว</dt>
        <dd>{lesson.durationSeconds ? formatDuration(lesson.durationSeconds) : "—"}</dd>

        <dt className="text-muted-foreground">วิดีโอ</dt>
        <dd>{lesson.bunnyVideoId ? "มีวิดีโอ" : "ยังไม่มีวิดีโอ"}</dd>

        <dt className="text-muted-foreground">ดูตัวอย่าง</dt>
        <dd>{lesson.isPreview ? "ใช่" : "ไม่"}</dd>

        <dt className="text-muted-foreground">ฟรี</dt>
        <dd>{lesson.isFree ? "ใช่" : "ไม่"}</dd>

        <dt className="text-muted-foreground">ลำดับ</dt>
        <dd>{lesson.sortOrder}</dd>
      </dl>

      {lesson.bodyMd && (
        <div>
          <h4 className="mb-1 text-sm font-medium text-muted-foreground">เนื้อหา (Markdown)</h4>
          <pre className="max-h-96 overflow-auto rounded border border-border bg-muted p-3 text-xs">
            {lesson.bodyMd}
          </pre>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

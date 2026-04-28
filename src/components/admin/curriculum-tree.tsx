"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createModuleAction,
  createLessonAction,
  reorderModulesAction,
  reorderLessonsAction,
  updateLessonAction,
} from "@/server/actions/admin-curriculum";
import type { AdminCurriculumModule, AdminCurriculumLesson } from "@/server/repos/admin-course";

interface CurriculumTreeProps {
  courseId: string;
  modules: AdminCurriculumModule[];
}

export function CurriculumTree({ courseId, modules: initialModules }: CurriculumTreeProps) {
  const router = useRouter();
  const [modules, setModules] = useState<AdminCurriculumModule[]>(initialModules);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(initialModules.map((m) => m.id)),
  );
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const debouncedSaveModules = useCallback(
    (newModules: AdminCurriculumModule[]) => {
      const key = `modules-${courseId}`;
      if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
      debounceRef.current[key] = setTimeout(() => {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("moduleIds", JSON.stringify(newModules.map((m) => m.id)));
        startTransition(async () => {
          const result = await reorderModulesAction(formData);
          if (!result.ok) {
            toast.error("บันทึกลำดับโมดูลไม่สำเร็จ");
          }
        });
      }, 500);
    },
    [courseId],
  );

  const debouncedSaveLessons = useCallback(
    (moduleId: string, newLessons: AdminCurriculumLesson[]) => {
      const key = `lessons-${moduleId}`;
      if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
      debounceRef.current[key] = setTimeout(() => {
        const formData = new FormData();
        formData.append("courseId", courseId);
        formData.append("moduleId", moduleId);
        formData.append("lessonIds", JSON.stringify(newLessons.map((l) => l.id)));
        startTransition(async () => {
          const result = await reorderLessonsAction(formData);
          if (!result.ok) {
            toast.error("บันทึกลำดับบทเรียนไม่สำเร็จ");
          }
        });
      }, 500);
    },
    [courseId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if dragging a module.
    const activeModuleIndex = modules.findIndex((m) => m.id === activeId);
    const overModuleIndex = modules.findIndex((m) => m.id === overId);

    if (activeModuleIndex !== -1 && overModuleIndex !== -1) {
      const newModules = arrayMove(modules, activeModuleIndex, overModuleIndex);
      setModules(newModules);
      debouncedSaveModules(newModules);
      return;
    }

    // Check if dragging a lesson.
    const activeModule = modules.find((m) => m.lessons.some((l) => l.id === activeId));
    const overModule = modules.find((m) => m.lessons.some((l) => l.id === overId));

    if (activeModule && overModule && activeModule.id === overModule.id) {
      const lessonIndex = activeModule.lessons.findIndex((l) => l.id === activeId);
      const overLessonIndex = activeModule.lessons.findIndex((l) => l.id === overId);
      const newLessons = arrayMove(activeModule.lessons, lessonIndex, overLessonIndex);
      const newModules = modules.map((m) =>
        m.id === activeModule.id ? { ...m, lessons: newLessons } : m,
      );
      setModules(newModules);
      debouncedSaveLessons(activeModule.id, newLessons);
    }
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-auto space-y-2">
            {modules.length === 0 && (
              <p className="text-sm text-muted-foreground">ยังไม่มีโมดูล</p>
            )}
            <SortableContext
              items={modules.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {modules.map((mod) => (
                <SortableModule
                  key={mod.id}
                  mod={mod}
                  courseId={courseId}
                  isExpanded={expandedModules.has(mod.id)}
                  onToggle={() => toggleModule(mod.id)}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={setSelectedLessonId}
                  addingLessonModuleId={addingLessonModuleId}
                  setAddingLessonModuleId={setAddingLessonModuleId}
                  onCreateLesson={handleCreateLesson}
                  pending={pending}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
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

function SortableModule({
  mod,
  courseId,
  isExpanded,
  onToggle,
  selectedLessonId,
  onSelectLesson,
  addingLessonModuleId,
  setAddingLessonModuleId,
  onCreateLesson,
  pending,
}: {
  mod: AdminCurriculumModule;
  courseId: string;
  isExpanded: boolean;
  onToggle: () => void;
  selectedLessonId: string | null;
  onSelectLesson: (id: string | null) => void;
  addingLessonModuleId: string | null;
  setAddingLessonModuleId: (id: string | null) => void;
  onCreateLesson: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id, data: { type: "module" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm font-medium hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          <span
            {...listeners}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            title="ลากเพื่อจัดลำดับ"
          >
            ⋮⋮
          </span>
          {mod.title}
        </span>
        <span className="text-xs text-muted-foreground">{isExpanded ? "▾" : "▸"}</span>
      </button>

      {isExpanded && (
        <div className="mt-1 ml-3 space-y-0.5 border-l border-border pl-2">
          <SortableContext
            items={mod.lessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {mod.lessons.map((ls) => (
              <SortableLesson
                key={ls.id}
                lesson={ls}
                courseId={courseId}
                isSelected={selectedLessonId === ls.id}
                onSelect={() => onSelectLesson(ls.id)}
              />
            ))}
          </SortableContext>

          {addingLessonModuleId === mod.id ? (
            <form onSubmit={onCreateLesson} className="flex gap-2 py-1">
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
  );
}

function SortableLesson({
  lesson: initialLesson,
  courseId,
  isSelected,
  onSelect,
}: {
  lesson: AdminCurriculumLesson;
  courseId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: initialLesson.id, data: { type: "lesson" } });

  const [lesson, setLesson] = useState(initialLesson);
  const [pending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function toggleField(field: "isPreview" | "isFree") {
    const newValue = !lesson[field];
    setLesson((prev) => ({ ...prev, [field]: newValue }));
    startTransition(async () => {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("lessonId", lesson.id);
      formData.append(field, String(newValue));
      await updateLessonAction(formData);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex w-full items-center justify-between rounded px-2 py-1 text-sm ${
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        <span
          {...listeners}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          title="ลากเพื่อจัดลำดับ"
        >
          ⋮⋮
        </span>
        {lesson.title}
      </span>
      <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleField("isPreview")}
          disabled={pending}
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            lesson.isPreview
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          title="ดูตัวอย่าง"
        >
          ตัวอย่าง
        </button>
        <button
          onClick={() => toggleField("isFree")}
          disabled={pending}
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            lesson.isFree
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          title="ฟรี"
        >
          ฟรี
        </button>
        <Link
          href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
          className="ml-1 text-xs text-primary hover:underline"
        >
          แก้ไข
        </Link>
      </span>
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

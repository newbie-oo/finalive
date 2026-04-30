"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
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
  updateModuleAction,
  deleteModuleAction,
  renameLessonAction,
  deleteLessonAction,
} from "@/server/actions/admin-curriculum";
import { createQuizAction } from "@/server/actions/admin-quiz";
import { MarkdownView } from "@/lib/markdown";
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
  const lastSyncRef = useRef<string>("");

  // Sync with server data only when the structure genuinely changes
  // (e.g. after router.refresh()), not on every re-render. This preserves
  // unsaved local DnD reordering.
  useEffect(() => {
    const signature = initialModules.map((m) => `${m.id}:${m.lessons.length}:${m.lessons.map((l) => l.id).join(",")}`).join("|");
    if (signature === lastSyncRef.current) return;
    lastSyncRef.current = signature;

    setModules(initialModules);
    setExpandedModules((prev) => {
      const next = new Set(prev);
      for (const m of initialModules) {
        if (!next.has(m.id)) next.add(m.id);
      }
      return next;
    });
  }, [initialModules]);

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
    const title = String(formData.get("title") ?? "");
    startTransition(async () => {
      const result = await createModuleAction(formData);
      if (result.ok && result.moduleId) {
        toast.success("สร้างโมดูลสำเร็จ");
        setAddingModule(false);
        const nextSortOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.sortOrder)) + 1 : 0;
        const newModule: AdminCurriculumModule = {
          id: result.moduleId,
          title,
          sortOrder: nextSortOrder,
          lessons: [],
        };
        setModules((prev) => [...prev, newModule]);
        setExpandedModules((prev) => {
          const next = new Set(prev);
          next.add(result.moduleId);
          return next;
        });
      } else {
        toast.error("สร้างโมดูลไม่สำเร็จ");
      }
    });
  }

  async function handleCreateLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const moduleId = String(formData.get("moduleId") ?? "");
    const title = String(formData.get("title") ?? "");
    startTransition(async () => {
      const result = await createLessonAction(formData);
      if (result.ok && result.lessonId) {
        toast.success("สร้างบทเรียนสำเร็จ");
        setAddingLessonModuleId(null);
        setModules((prev) =>
          prev.map((m) => {
            if (m.id !== moduleId) return m;
            const nextSortOrder = m.lessons.length > 0 ? Math.max(...m.lessons.map((l) => l.sortOrder)) + 1 : 0;
            const newLesson: AdminCurriculumLesson = {
              id: result.lessonId,
              title,
              bodyMd: "",
              durationSeconds: null,
              isPreview: false,
              isFree: false,
              sortOrder: nextSortOrder,
              videoMediaId: null,
              bunnyVideoId: null,
              quizId: null,
            };
            return { ...m, lessons: [...m.lessons, newLesson] };
          }),
        );
        setExpandedModules((prev) => {
          const next = new Set(prev);
          next.add(moduleId);
          return next;
        });
      } else {
        toast.error("สร้างบทเรียนไม่สำเร็จ");
      }
    });
  }

  function handleRenameModule(moduleId: string, title: string) {
    // Optimistic local update first.
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
    startTransition(async () => {
      const result = await updateModuleAction({ courseId, moduleId, title });
      if (!result.ok) {
        toast.error("เปลี่ยนชื่อโมดูลไม่สำเร็จ");
        router.refresh();
      }
    });
  }

  function handleDeleteModule(moduleId: string) {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    startTransition(async () => {
      const result = await deleteModuleAction({ courseId, moduleId });
      if (result.ok) {
        toast.success("ลบโมดูลแล้ว");
      } else {
        toast.error("ลบโมดูลไม่สำเร็จ");
        router.refresh();
      }
    });
  }

  function handleRenameLesson(lessonId: string, title: string) {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, title } : l)),
      })),
    );
    startTransition(async () => {
      const result = await renameLessonAction({ courseId, lessonId, title });
      if (!result.ok) {
        toast.error("เปลี่ยนชื่อบทเรียนไม่สำเร็จ");
        router.refresh();
      }
    });
  }

  function handleDeleteLesson(lessonId: string) {
    setModules((prev) =>
      prev.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })),
    );
    if (selectedLessonId === lessonId) setSelectedLessonId(null);
    startTransition(async () => {
      const result = await deleteLessonAction({ courseId, lessonId });
      if (result.ok) {
        toast.success("ลบบทเรียนแล้ว");
      } else {
        toast.error("ลบบทเรียนไม่สำเร็จ");
        router.refresh();
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

        <DndContext
          id="curriculum-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                  onRename={handleRenameModule}
                  onDelete={handleDeleteModule}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={setSelectedLessonId}
                  onLessonRename={handleRenameLesson}
                  onLessonDelete={handleDeleteLesson}
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
  onRename,
  onDelete,
  selectedLessonId,
  onSelectLesson,
  onLessonRename,
  onLessonDelete,
  addingLessonModuleId,
  setAddingLessonModuleId,
  onCreateLesson,
  pending,
}: {
  mod: AdminCurriculumModule;
  courseId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  selectedLessonId: string | null;
  onSelectLesson: (id: string | null) => void;
  onLessonRename: (id: string, title: string) => void;
  onLessonDelete: (id: string) => void;
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

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(mod.title);
  const [prevTitle, setPrevTitle] = useState(mod.title);
  // React's "store snapshot of prop" pattern (replaces a setState-in-effect
  // sync). Resync only when the user isn't actively editing — otherwise a
  // refresh from the server would clobber an in-progress rename.
  if (!editing && prevTitle !== mod.title) {
    setPrevTitle(mod.title);
    setDraftTitle(mod.title);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function commitRename() {
    const next = draftTitle.trim();
    setEditing(false);
    if (!next || next === mod.title) {
      setDraftTitle(mod.title);
      return;
    }
    onRename(mod.id, next);
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group/mod flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted">
        <span
          {...listeners}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          title="ลากเพื่อจัดลำดับ"
        >
          ⋮⋮
        </span>

        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
              else if (e.key === "Escape") { setEditing(false); setDraftTitle(mod.title); }
            }}
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm font-medium"
          />
        ) : (
          <button onClick={onToggle} className="flex flex-1 items-center justify-between text-left">
            <span className="truncate">{mod.title}</span>
            <span className="text-xs text-muted-foreground">{isExpanded ? "▾" : "▸"}</span>
          </button>
        )}

        {!editing && (
          <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/mod:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background"
              title="เปลี่ยนชื่อโมดูล"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`ลบโมดูล "${mod.title}" และบทเรียน ${mod.lessons.length} บทใต้โมดูลนี้?`)) {
                  onDelete(mod.id);
                }
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
              title="ลบโมดูล"
            >
              ✕
            </button>
          </span>
        )}
      </div>

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
                onRename={onLessonRename}
                onDelete={onLessonDelete}
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
  lesson,
  courseId,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  lesson: AdminCurriculumLesson;
  courseId: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, data: { type: "lesson" } });

  // Keep only optimistic toggle state locally; read everything else from props
  // so quizId, title, etc. always reflect the latest server data.
  const [isPreview, setIsPreview] = useState(lesson.isPreview);
  const [isFree, setIsFree] = useState(lesson.isFree);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(lesson.title);

  // Snapshot-of-prop pattern (replaces 3 setState-in-effect syncs).
  // Resync local UI state only when the relevant prop genuinely changed —
  // and for draftTitle, only when the user isn't mid-edit.
  const [prevPreview, setPrevPreview] = useState(lesson.isPreview);
  if (prevPreview !== lesson.isPreview) {
    setPrevPreview(lesson.isPreview);
    setIsPreview(lesson.isPreview);
  }
  const [prevFree, setPrevFree] = useState(lesson.isFree);
  if (prevFree !== lesson.isFree) {
    setPrevFree(lesson.isFree);
    setIsFree(lesson.isFree);
  }
  const [prevTitle, setPrevTitle] = useState(lesson.title);
  if (!editing && prevTitle !== lesson.title) {
    setPrevTitle(lesson.title);
    setDraftTitle(lesson.title);
  }

  function commitRename() {
    const next = draftTitle.trim();
    setEditing(false);
    if (!next || next === lesson.title) {
      setDraftTitle(lesson.title);
      return;
    }
    onRename(lesson.id, next);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function toggleField(field: "isPreview" | "isFree") {
    const newValue = field === "isPreview" ? !isPreview : !isFree;
    if (field === "isPreview") setIsPreview(newValue);
    else setIsFree(newValue);
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
      <span className="flex flex-1 items-center gap-2 truncate">
        <span
          {...listeners}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          title="ลากเพื่อจัดลำดับ"
        >
          ⋮⋮
        </span>
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
              else if (e.key === "Escape") { setEditing(false); setDraftTitle(lesson.title); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          />
        ) : (
          <span className="truncate">{lesson.title}</span>
        )}
      </span>
      <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleField("isPreview")}
          disabled={pending}
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            isPreview
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
            isFree
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          title="ฟรี"
        >
          ฟรี
        </button>
        <LessonQuizInlineAction courseId={courseId} lesson={lesson} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background"
          title="เปลี่ยนชื่อบทเรียน"
        >
          ✎
        </button>
        <Link
          href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
          className="ml-1 text-xs text-primary hover:underline"
        >
          แก้ไข
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`ลบบทเรียน "${lesson.title}"?`)) onDelete(lesson.id);
          }}
          className="rounded px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
          title="ลบบทเรียน"
        >
          ✕
        </button>
      </span>
    </div>
  );
}

function LessonQuizInlineAction({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: AdminCurriculumLesson;
}) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();

  if (lesson.quizId) {
    return (
      <Link
        href={`/admin/courses/${courseId}/quizzes/${lesson.quizId}`}
        className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] text-success hover:bg-success/30"
        title="แก้ไขแบบทดสอบ"
      >
        ข้อสอบ →
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={creating}
      onClick={() => {
        // Confirm with the admin before silently creating a quiz row + nav
        // away. The previous version was a one-click trapdoor.
        const defaultTitle = `แบบทดสอบ: ${lesson.title}`;
        const title = window.prompt(
          `สร้างแบบทดสอบสำหรับ "${lesson.title}"\nกรอกชื่อแบบทดสอบ (Enter เพื่อใช้ค่าเริ่มต้น):`,
          defaultTitle,
        );
        if (title === null) return; // user cancelled
        const finalTitle = title.trim() || defaultTitle;
        const passInput = window.prompt(
          "คะแนนขั้นต่ำผ่าน (%) — กรอกระหว่าง 1–100:",
          "60",
        );
        if (passInput === null) return;
        const passScorePct = Math.max(1, Math.min(100, parseInt(passInput, 10) || 60));

        startCreate(async () => {
          const result = await createQuizAction({
            lessonId: lesson.id,
            title: finalTitle,
            passScorePct,
          });
          if (result.ok && result.quizId) {
            toast.success("สร้างแบบทดสอบสำเร็จ");
            router.push(`/admin/courses/${courseId}/quizzes/${result.quizId}`);
          } else {
            toast.error("สร้างแบบทดสอบไม่สำเร็จ");
          }
        });
      }}
      className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
      title="สร้างแบบทดสอบให้บทเรียนนี้"
    >
      {creating ? "กำลังสร้าง…" : "+ ข้อสอบ"}
    </button>
  );
}

function LessonDetailPanel({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: AdminCurriculumLesson;
}) {
  // The detail panel used to duplicate fields that the full lesson editor
  // already exposes (preview/free toggles, quiz CTA). Those toggles also
  // live as inline buttons on the lesson row in the tree, so showing them
  // again here was redundant. We now render a quick read-only summary
  // plus a single primary CTA into the full editor — removing the
  // "where do I edit this?" confusion.
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-lg font-medium">{lesson.title}</h3>
        <Button size="sm" variant="primary" asChild>
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>เปิดตัวแก้ไข →</Link>
        </Button>
      </div>

      <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">ความยาว</dt>
        <dd>{lesson.durationSeconds ? formatDuration(lesson.durationSeconds) : "—"}</dd>

        <dt className="text-muted-foreground">วิดีโอ</dt>
        <dd>{lesson.bunnyVideoId ? "มีวิดีโอ" : "ยังไม่มีวิดีโอ"}</dd>

        <dt className="text-muted-foreground">สิทธิ์</dt>
        <dd>
          {lesson.isPreview && lesson.isFree
            ? "ตัวอย่างฟรี + เปิดให้ทุกคน"
            : lesson.isPreview
              ? "ดูตัวอย่างได้"
              : lesson.isFree
                ? "เปิดให้ทุกคน"
                : "เฉพาะผู้ลงทะเบียน"}
        </dd>

        <dt className="text-muted-foreground">แบบทดสอบ</dt>
        <dd>
          {lesson.quizId ? (
            <Link
              href={`/admin/courses/${courseId}/quizzes/${lesson.quizId}`}
              className="text-primary hover:underline"
            >
              แก้ไขแบบทดสอบ →
            </Link>
          ) : (
            <span className="text-muted-foreground">ยังไม่มี — กดปุ่ม “+ ข้อสอบ” ที่บทเรียนเพื่อสร้าง</span>
          )}
        </dd>
      </dl>

      {lesson.bodyMd && (
        <div>
          <h4 className="mb-1 text-sm font-medium text-muted-foreground">ตัวอย่างเนื้อหา</h4>
          <div className="max-h-96 overflow-auto rounded border border-border bg-(--surface) p-3 text-sm">
            <MarkdownView text={lesson.bodyMd} />
          </div>
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

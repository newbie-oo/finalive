"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
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
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	createModuleAction,
	createLessonAction,
	reorderModulesAction,
	reorderLessonsAction,
	updateModuleAction,
	deleteModuleAction,
	renameLessonAction,
	deleteLessonAction,
} from "@/server/actions/admin-curriculum";
import { SortableModule } from "./sortable-module";
import { LessonDetailPanel } from "./lesson-detail-panel";
import type {
	AdminCurriculumModule,
	AdminCurriculumLesson,
} from "@/server/repos/admin-course";

interface CurriculumTreeProps {
	courseId: string;
	modules: AdminCurriculumModule[];
}

export function CurriculumTree({
	courseId,
	modules: initialModules,
}: CurriculumTreeProps) {
	const router = useRouter();
	const [modules, setModules] =
		useState<AdminCurriculumModule[]>(initialModules);
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
	const [expandedModules, setExpandedModules] = useState<Set<string>>(
		() => new Set(initialModules.map((m) => m.id)),
	);
	const [addingModule, setAddingModule] = useState(false);
	const [addingLessonModuleId, setAddingLessonModuleId] = useState<
		string | null
	>(null);
	const [pending, startTransition] = useTransition();

	const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
	const lastSyncRef = useRef<string>("");

	// Sync with server data only when the structure genuinely changes
	// (e.g. after router.refresh()), not on every re-render. This preserves
	// unsaved local DnD reordering.
	useEffect(() => {
		const signature = initialModules
			.map(
				(m) =>
					`${m.id}:${m.lessons.length}:${m.lessons.map((l) => l.id).join(",")}`,
			)
			.join("|");
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
			const result = await createModuleAction({ courseId, title });
			if (result.ok && result.moduleId) {
				toast.success("สร้างโมดูลสำเร็จ");
				setAddingModule(false);
				const nextSortOrder =
					modules.length > 0
						? Math.max(...modules.map((m) => m.sortOrder)) + 1
						: 0;
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
			const result = await createLessonAction({ courseId, moduleId, title });
			if (result.ok && result.lessonId) {
				toast.success("สร้างบทเรียนสำเร็จ");
				setAddingLessonModuleId(null);
				setModules((prev) =>
					prev.map((m) => {
						if (m.id !== moduleId) return m;
						const nextSortOrder =
							m.lessons.length > 0
								? Math.max(...m.lessons.map((l) => l.sortOrder)) + 1
								: 0;
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
		setModules((prev) =>
			prev.map((m) => (m.id === moduleId ? { ...m, title } : m)),
		);
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
				lessons: m.lessons.map((l) =>
					l.id === lessonId ? { ...l, title } : l,
				),
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
			prev.map((m) => ({
				...m,
				lessons: m.lessons.filter((l) => l.id !== lessonId),
			})),
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
				startTransition(async () => {
					const result = await reorderModulesAction({
						courseId,
						moduleIds: newModules.map((m) => m.id),
					});
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
				startTransition(async () => {
					const result = await reorderLessonsAction({
						courseId,
						moduleId,
						lessonIds: newLessons.map((l) => l.id),
					});
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
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
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
		const activeModule = modules.find((m) =>
			m.lessons.some((l) => l.id === activeId),
		);
		const overModule = modules.find((m) =>
			m.lessons.some((l) => l.id === overId),
		);

		if (activeModule && overModule && activeModule.id === overModule.id) {
			const lessonIndex = activeModule.lessons.findIndex(
				(l) => l.id === activeId,
			);
			const overLessonIndex = activeModule.lessons.findIndex(
				(l) => l.id === overId,
			);
			const newLessons = arrayMove(
				activeModule.lessons,
				lessonIndex,
				overLessonIndex,
			);
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
					<Button
						size="xs"
						variant="outline"
						onClick={() => setAddingModule(true)}
						disabled={pending}
					>
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
						<Button
							size="xs"
							variant="ghost"
							onClick={() => setAddingModule(false)}
							type="button"
						>
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

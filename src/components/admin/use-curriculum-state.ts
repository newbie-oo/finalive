"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
	createLessonAction,
	createModuleAction,
	deleteLessonAction,
	deleteModuleAction,
	renameLessonAction,
	reorderLessonsAction,
	reorderModulesAction,
	updateModuleAction,
} from "@/server/actions/admin-curriculum";
import type {
	AdminCurriculumLesson,
	AdminCurriculumModule,
} from "@/server/repos/admin-curriculum";

interface UseCurriculumStateArgs {
	courseId: string;
	initialModules: AdminCurriculumModule[];
}

/**
 * Owns the curriculum tree's local state, optimistic mutations, and DnD wiring.
 * Keeps the view component free of side-effect plumbing so it can stay
 * declarative.
 */
export function useCurriculumState({
	courseId,
	initialModules,
}: UseCurriculumStateArgs) {
	const router = useRouter();
	const [modules, setModules] =
		useState<AdminCurriculumModule[]>(initialModules);
	const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
	const [expandedModules, setExpandedModules] = useState<Set<string>>(
		() => new Set(initialModules.map((m) => m.id)),
	);
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

	async function createModule(title: string) {
		startTransition(async () => {
			const result = await createModuleAction({ courseId, title });
			if (result.ok && result.moduleId) {
				toast.success("สร้างโมดูลสำเร็จ");
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

	async function createLesson(moduleId: string, title: string) {
		startTransition(async () => {
			const result = await createLessonAction({ courseId, moduleId, title });
			if (result.ok && result.lessonId) {
				toast.success("สร้างบทเรียนสำเร็จ");
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

	function renameModule(moduleId: string, title: string) {
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

	function deleteModule(moduleId: string) {
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

	function renameLesson(lessonId: string, title: string) {
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

	function deleteLesson(lessonId: string) {
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

		const activeModuleIndex = modules.findIndex((m) => m.id === activeId);
		const overModuleIndex = modules.findIndex((m) => m.id === overId);

		if (activeModuleIndex !== -1 && overModuleIndex !== -1) {
			const newModules = arrayMove(modules, activeModuleIndex, overModuleIndex);
			setModules(newModules);
			debouncedSaveModules(newModules);
			return;
		}

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

	return {
		modules,
		selectedLesson,
		selectedLessonId,
		setSelectedLessonId,
		expandedModules,
		toggleModule,
		pending,
		sensors,
		handleDragEnd,
		actions: {
			createModule,
			createLesson,
			renameModule,
			deleteModule,
			renameLesson,
			deleteLesson,
		},
	};
}

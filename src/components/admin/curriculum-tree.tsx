"use client";

import { useState } from "react";
import {
	DndContext,
	closestCenter,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { SortableModule } from "./sortable-module";
import { LessonDetailPanel } from "./lesson-detail-panel";
import { useCurriculumState } from "./use-curriculum-state";
import type { AdminCurriculumModule } from "@/server/repos/admin-course";

interface CurriculumTreeProps {
	courseId: string;
	modules: AdminCurriculumModule[];
}

export function CurriculumTree({
	courseId,
	modules: initialModules,
}: CurriculumTreeProps) {
	const {
		modules,
		selectedLesson,
		selectedLessonId,
		setSelectedLessonId,
		expandedModules,
		toggleModule,
		pending,
		sensors,
		handleDragEnd,
		actions,
	} = useCurriculumState({ courseId, initialModules });

	const [addingModule, setAddingModule] = useState(false);
	const [addingLessonModuleId, setAddingLessonModuleId] = useState<
		string | null
	>(null);

	function handleCreateModule(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const title = String(formData.get("title") ?? "");
		setAddingModule(false);
		actions.createModule(title);
	}

	function handleCreateLesson(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const moduleId = String(formData.get("moduleId") ?? "");
		const title = String(formData.get("title") ?? "");
		setAddingLessonModuleId(null);
		actions.createLesson(moduleId, title);
	}

	const onDragEnd = (event: DragEndEvent) => handleDragEnd(event);

	return (
		<div className="flex h-[calc(100vh-8rem)] gap-4">
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
							className="flex-1 rounded-sm border border-border bg-background px-2 py-1 text-sm"
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
					onDragEnd={onDragEnd}
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
									onRename={actions.renameModule}
									onDelete={actions.deleteModule}
									selectedLessonId={selectedLessonId}
									onSelectLesson={setSelectedLessonId}
									onLessonRename={actions.renameLesson}
									onLessonDelete={actions.deleteLesson}
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

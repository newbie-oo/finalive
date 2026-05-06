"use client";

import { useState } from "react";
import {
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { SortableLesson } from "./sortable-lesson";
import type { AdminCurriculumModule } from "@/server/repos/admin-course";

export function SortableModule({
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
							if (e.key === "Enter") {
								e.preventDefault();
								commitRename();
							} else if (e.key === "Escape") {
								setEditing(false);
								setDraftTitle(mod.title);
							}
						}}
						className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm font-medium"
					/>
				) : (
					<button
						onClick={onToggle}
						className="flex flex-1 items-center justify-between text-left"
					>
						<span className="truncate">{mod.title}</span>
						<span className="text-xs text-muted-foreground">
							{isExpanded ? "▾" : "▸"}
						</span>
					</button>
				)}

				{!editing && (
					<span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/mod:opacity-100">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setEditing(true);
							}}
							className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background"
							title="เปลี่ยนชื่อโมดูล"
						>
							✎
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (
									confirm(
										`ลบโมดูล "${mod.title}" และบทเรียน ${mod.lessons.length} บทใต้โมดูลนี้?`,
									)
								) {
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

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateLessonAction } from "@/server/actions/admin-curriculum";
import { LessonQuizInlineAction } from "./lesson-quiz-inline-action";
import type { AdminCurriculumLesson } from "@/server/repos/admin-course";

export function SortableLesson({
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
			await updateLessonAction({
				courseId,
				lessonId: lesson.id,
				[field]: newValue,
			});
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
			className={`flex w-full items-center justify-between rounded-sm px-2 py-1 text-sm ${
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
							if (e.key === "Enter") {
								e.preventDefault();
								commitRename();
							} else if (e.key === "Escape") {
								setEditing(false);
								setDraftTitle(lesson.title);
							}
						}}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 rounded-sm border border-border bg-background px-2 py-1 text-sm"
					/>
				) : (
					<span className="truncate">{lesson.title}</span>
				)}
			</span>
			<span
				className="flex items-center gap-1 shrink-0"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					onClick={() => toggleField("isPreview")}
					disabled={pending}
					className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
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
					className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
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
					onClick={(e) => {
						e.stopPropagation();
						setEditing(true);
					}}
					className="rounded-sm px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background"
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
					className="rounded-sm px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
					title="ลบบทเรียน"
				>
					✕
				</button>
			</span>
		</div>
	);
}

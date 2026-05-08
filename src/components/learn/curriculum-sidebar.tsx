"use client";

import { Fragment } from "react";
import { useParams } from "next/navigation";
import { LockSimple, CaretDown, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useCurriculumProgress } from "@/hooks/use-curriculum-progress";
import { useLessonAccess } from "@/hooks/use-lesson-access";
import { CurriculumProgressHeader } from "./curriculum-progress-header";
import { CurriculumLessonItem } from "./curriculum-lesson-item";
import { CurriculumQuizItem } from "./curriculum-quiz-item";
import { SidebarNotesCard } from "./sidebar-notes-card";

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

	const { progressMap, doneCount, lessonCount, progressPct, remainingSeconds } =
		useCurriculumProgress(modules, progress, totalLessons);

	const { lessonLocked, moduleLocked } = useLessonAccess({
		modules,
		isEnrolled,
		isAdmin,
	});

	return (
		<nav className="flex h-full flex-col bg-card">
			<CurriculumProgressHeader
				progressPct={progressPct}
				doneCount={doneCount}
				lessonCount={lessonCount}
				remainingSeconds={remainingSeconds}
			/>

			<div className="flex-1 overflow-y-auto p-3">
				{modules.map((mod) => {
					const modCompleted = mod.lessons.filter(
						(l) => progressMap.get(l.id) === "completed",
					).length;
					const modLocked = moduleLocked.get(mod.id) ?? false;

					return (
						<div key={mod.id} className="mb-4">
							<ModuleHeader
								title={mod.title}
								locked={modLocked}
								completed={modCompleted}
								total={mod.lessons.length}
							/>

							{!modLocked && (
								<ul className="flex flex-col gap-0.5">
									{mod.lessons.map((les) => {
										const isActive = les.id === activeLessonId;
										const locked = lessonLocked.get(les.id) ?? false;
										const status = progressMap.get(les.id) ?? "not_started";

										return (
											<Fragment key={les.id}>
												<li>
													<CurriculumLessonItem
														courseSlug={courseSlug}
														lessonId={les.id}
														title={les.title}
														durationSeconds={les.durationSeconds}
														isPreview={les.isPreview}
														isFree={les.isFree}
														status={status}
														locked={locked}
														isActive={isActive}
														onNavigate={onClose}
													/>
												</li>
												{les.quizId && (
													<li>
														<CurriculumQuizItem
															courseSlug={courseSlug}
															quizId={les.quizId}
															passed={passedQuizIds?.get(les.quizId)}
															onNavigate={onClose}
														/>
													</li>
												)}
											</Fragment>
										);
									})}
								</ul>
							)}
						</div>
					);
				})}

				{activeLessonId && <SidebarNotesCard lessonId={activeLessonId} />}
			</div>
		</nav>
	);
}

function ModuleHeader({
	title,
	locked,
	completed,
	total,
}: {
	title: string;
	locked: boolean;
	completed: number;
	total: number;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 px-2 py-2 text-uism font-semibold",
				locked ? "text-foreground-subtle" : "text-foreground",
			)}
		>
			{locked ? <CaretRight size={16} /> : <CaretDown size={16} />}
			<span className="flex-1 truncate">{title}</span>
			{locked ? (
				<LockSimple size={14} className="text-foreground-subtle" />
			) : (
				<span className="num text-caption text-foreground-subtle">
					{completed}/{total}
				</span>
			)}
		</div>
	);
}

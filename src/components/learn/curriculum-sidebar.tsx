"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	Check,
	Play,
	Question,
	LockSimple,
	CaretDown,
	CaretRight,
	NotePencil,
} from "@phosphor-icons/react";
import { LessonAccessBadge } from "@/components/course/lesson-access-badge";
import { cn } from "@/lib/utils";
import { useCurriculumProgress } from "@/hooks/use-curriculum-progress";
import { useLessonAccess } from "@/hooks/use-lesson-access";
import { useNotePreview } from "@/hooks/use-note-preview";

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

function fmtHours(seconds: number): string {
	return (seconds / 3600).toFixed(1);
}

function CircularProgress({ pct, size = 64 }: { pct: number; size?: number }) {
	const stroke = 6;
	const r = (size - stroke) / 2;
	const C = 2 * Math.PI * r;
	const dash = (pct / 100) * C;
	return (
		<div className="relative" style={{ width: size, height: size }}>
			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--border)"
					strokeWidth={stroke}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--primary)"
					strokeWidth={stroke}
					strokeDasharray={`${dash} ${C}`}
					strokeLinecap="round"
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="num text-uism font-bold text-(--foreground)">
					{pct}%
				</span>
			</div>
		</div>
	);
}

function StatusIcon({
	status,
	locked,
	isQuiz,
}: {
	status: string;
	locked: boolean;
	isQuiz?: boolean;
}) {
	if (locked) {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-(--border-strong)">
				<LockSimple size={12} className="text-foreground-subtle" />
			</div>
		);
	}
	if (status === "completed") {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-(--success) text-white">
				<Check size={14} weight="bold" />
			</div>
		);
	}
	if (status === "in_progress") {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-(--primary) text-white">
				<Play size={10} weight="fill" />
			</div>
		);
	}
	if (isQuiz) {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-(--border-strong) bg-(--surface)">
				<Question size={12} className="text-foreground-subtle" />
			</div>
		);
	}
	return (
		<div className="h-[22px] w-[22px] rounded-full border border-(--border-strong) bg-(--surface)" />
	);
}

function SidebarNotesCard({ lessonId }: { lessonId: string }) {
	const preview = useNotePreview(lessonId);

	if (!preview) return null;

	return (
		<div className="mt-4 rounded-xl border border-(--primary)/20 bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
			<div className="mb-2 flex items-center gap-2">
				<NotePencil size={16} className="text-(--primary)" />
				<span className="text-uism font-semibold text-(--foreground)">
					โน้ตของฉัน
				</span>
			</div>
			<p className="text-caption leading-relaxed text-(--foreground-muted)">
				{preview}
			</p>
		</div>
	);
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
		<nav className="flex h-full flex-col bg-(--surface)">
			{/* Progress header */}
			<div className="border-b border-(--border) px-5 py-4">
				<div className="flex items-center gap-4">
					<CircularProgress pct={progressPct} size={64} />
					<div>
						<div className="text-ui font-semibold text-(--foreground)">
							<span className="num">{doneCount}</span> /{" "}
							<span className="num">{lessonCount}</span> บทเรียน
						</div>
						<div className="text-caption text-(--foreground-muted)">
							เหลือ <span className="num">{fmtHours(remainingSeconds)}</span> ชม.
						</div>
					</div>
				</div>
			</div>

			{/* Lesson list */}
			<div className="flex-1 overflow-y-auto p-3">
				{modules.map((mod) => {
					const modCompleted = mod.lessons.filter(
						(l) => progressMap.get(l.id) === "completed",
					).length;
					const modLocked = moduleLocked.get(mod.id) ?? false;

					return (
						<div key={mod.id} className="mb-4">
							{/* Module header */}
							<div
								className={cn(
									"flex items-center gap-2 px-2 py-2 text-uism font-semibold",
									modLocked ? "text-foreground-subtle" : "text-(--foreground)",
								)}
							>
								{modLocked ? <CaretRight size={16} /> : <CaretDown size={16} />}
								<span className="flex-1 truncate">{mod.title}</span>
								{modLocked ? (
									<LockSimple size={14} className="text-foreground-subtle" />
								) : (
									<span className="num text-caption text-foreground-subtle">
										{modCompleted}/{mod.lessons.length}
									</span>
								)}
							</div>

							{/* Lessons */}
							{!modLocked && (
								<ul className="flex flex-col gap-0.5">
									{mod.lessons.map((les) => {
										const isActive = les.id === activeLessonId;
										const locked = lessonLocked.get(les.id) ?? false;
										const stat = progressMap.get(les.id) ?? "not_started";

										const baseClass =
											"flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left text-uism transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)";
										const stateClass = isActive
											? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-(--primary) border-l-[3px] border-(--primary)"
											: locked
												? "cursor-not-allowed text-foreground-subtle"
												: "text-(--foreground) hover:bg-(--surface-muted)";

										const inner = (
											<>
												<StatusIcon status={stat} locked={locked} />
												<span className="flex-1 truncate">
													{locked ? (
														<span className="sr-only">ล็อก: </span>
													) : null}
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
											<Fragment key={les.id}>
												<li>
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
															prefetch
															scroll={false}
														>
															{inner}
														</Link>
													)}
												</li>
												{les.quizId && (
													<li>
														<Link
															href={`/learn/${courseSlug}/quiz/${les.quizId}`}
															className={cn(
																"flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-uism transition-colors",
																"text-(--foreground) hover:bg-(--surface-muted)",
															)}
															onClick={onClose}
															prefetch
															scroll={false}
														>
															{passedQuizIds?.get(les.quizId) === true ? (
																<CheckCircleIcon />
															) : (
																<QuizIcon />
															)}
															<span className="flex-1 truncate">
																แบบทดสอบ
																{passedQuizIds?.get(les.quizId) === false ? (
																	<span className="ml-2 text-caption text-(--destructive-fg)">
																		ลองอีกครั้ง
																	</span>
																) : null}
															</span>
														</Link>
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

				{/* Notes preview */}
				{activeLessonId && <SidebarNotesCard lessonId={activeLessonId} />}
			</div>
		</nav>
	);
}

function CheckCircleIcon() {
	return (
		<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-(--success) text-white">
			<Check size={14} weight="bold" />
		</div>
	);
}

function QuizIcon() {
	return (
		<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-(--border-strong) bg-(--surface)">
			<Question size={12} className="text-foreground-subtle" />
		</div>
	);
}

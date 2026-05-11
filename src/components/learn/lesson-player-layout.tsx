"use client";

import Link from "next/link";
import { MarkdownView } from "@/lib/markdown";
import { LessonClient } from "./lesson-client";
import { NotesPanel } from "./notes-panel";
import { formatDurationMinutes } from "@/lib/format";
import {
	Check,
	ArrowLeft,
	ArrowRight,
	ChatCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { CertificateClaim } from "./certificate-claim";
import { LessonToc } from "./lesson-toc";
import { useLessonPlayer } from "@/hooks/use-lesson-player";

export interface LessonPlayerLayoutProps {
	lessonId: string;
	lessonTitle: string;
	moduleTitle: string;
	lessonBodyMd: string | null;
	durationSeconds: number | null;
	totalLessons: number;
	doneLessons: number;
	courseSlug: string;
	nextLessonId: string | null;
	prevLessonId: string | null;
	quizId: string | null;
	watchedSeconds?: number;
	isAdmin?: boolean;
	isCompleted?: boolean;
	playerSlot: React.ReactNode;
}

export function LessonPlayerLayout({
	lessonId,
	lessonTitle,
	moduleTitle,
	lessonBodyMd,
	durationSeconds,
	totalLessons,
	doneLessons,
	courseSlug,
	nextLessonId,
	prevLessonId,
	quizId,
	watchedSeconds = 0,
	isAdmin = false,
	isCompleted = false,
	playerSlot,
}: LessonPlayerLayoutProps) {
	const { activeTab, setActiveTab, completed, canMarkComplete, markComplete } =
		useLessonPlayer({
			lessonId,
			durationSeconds,
			watchedSeconds,
			isAdmin,
			isCompleted,
		});

	return (
		<>
			{playerSlot}

			<div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary"
						style={{
							width: `${totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%`,
						}}
					/>
				</div>
				<span className="num text-caption font-semibold text-primary">
					{totalLessons > 0
						? Math.round((doneLessons / totalLessons) * 100)
						: 0}
					%
				</span>
			</div>

			<div className="px-4 pt-5 lg:px-8 lg:pt-8 max-w-[920px] mx-auto">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<div className="mb-1 text-uism font-semibold text-primary">
							{moduleTitle}
						</div>
						<h1 className="text-h2 mb-1" style={{ margin: 0 }}>
							{lessonTitle}
						</h1>
						<div className="flex flex-wrap items-center gap-3 text-muted-foreground">
							<span className="text-caption flex items-center gap-1">
								<span className="num">
									{formatDurationMinutes(durationSeconds)}
								</span>
							</span>
							<span style={{ color: "var(--border-strong)" }}>·</span>
							<span className="text-caption">{moduleTitle}</span>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<MarkCompleteButton
							completed={completed}
							canMarkComplete={canMarkComplete}
							onClick={markComplete}
						/>
					</div>
				</div>
			</div>

			{totalLessons > 0 && doneLessons >= totalLessons && (
				<div className="mx-auto max-w-[920px] px-4 pt-4 lg:px-8">
					<CertificateClaim variant="banner" />
				</div>
			)}

			<div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[920px] mx-auto">
				<div
					className="sticky top-14 z-30 -mx-4 mb-6 flex gap-6 border-b border-border bg-background/90 px-4 backdrop-blur lg:-mx-8 lg:px-8"
					role="tablist"
					aria-label="Lessons"
				>
					<TabButton
						active={activeTab === "content"}
						onClick={() => setActiveTab("content")}
					>
						เนื้อหา
					</TabButton>
					<TabButton
						active={activeTab === "notes"}
						onClick={() => setActiveTab("notes")}
					>
						โน้ต
					</TabButton>
					<TabButton
						active={activeTab === "qna"}
						onClick={() => setActiveTab("qna")}
					>
						Q&amp;A
					</TabButton>
				</div>

				{activeTab === "notes" && <NotesPanel lessonId={lessonId} />}
				{activeTab === "qna" && (
					<EmptyState
						icon={<ChatCircle size={28} weight="duotone" />}
						title="ยังไม่มีคำถามในบทเรียนนี้"
						description="ตั้งคำถามแรกได้ — ผู้สอนจะตอบกลับภายใน 24 ชม. (เร็วๆ นี้)"
					/>
				)}
				{activeTab === "content" && (
					<div className="xl:grid xl:grid-cols-[minmax(0,1fr)_240px] xl:gap-8">
						<div className="min-w-0">
							{lessonBodyMd && (
								<article className="prose-style mb-8">
									<MarkdownView text={lessonBodyMd} />
								</article>
							)}

							<LessonClient
								lessonId={lessonId}
								courseSlug={courseSlug}
								nextLessonId={nextLessonId}
								quizId={quizId}
								durationSeconds={durationSeconds}
								isAdmin={isAdmin}
								completed={completed}
							/>
						</div>
						{lessonBodyMd && <LessonToc lessonId={lessonId} />}
					</div>
				)}

				<div className="mt-8 flex items-center justify-between border-t border-border pt-6">
					{prevLessonId ? (
						<Button variant="secondary" size="md" asChild>
							<Link href={`/learn/${courseSlug}/${prevLessonId}`}>
								<ArrowLeft size={16} /> บทก่อนหน้า
							</Link>
						</Button>
					) : (
						<div />
					)}
					<div />
					{nextLessonId ? (
						<Button variant="primary" size="md" asChild>
							<Link href={`/learn/${courseSlug}/${nextLessonId}`}>
								บทถัดไป <ArrowRight size={16} />
							</Link>
						</Button>
					) : (
						<div />
					)}
				</div>
			</div>
		</>
	);
}

interface TabButtonProps {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
	return (
		<button
			role="tab"
			aria-selected={active}
			aria-current={active ? "page" : undefined}
			onClick={onClick}
			className={`border-b-2 px-0 py-3 text-ui font-medium transition-colors ${
				active
					? "border-primary text-primary"
					: "border-transparent text-muted-foreground hover:text-foreground"
			}`}
		>
			{children}
		</button>
	);
}

interface MarkCompleteButtonProps {
	completed: boolean;
	canMarkComplete: boolean;
	onClick: () => void;
}

function MarkCompleteButton({
	completed,
	canMarkComplete,
	onClick,
}: MarkCompleteButtonProps) {
	const button = (
		<Button
			onClick={onClick}
			disabled={completed || !canMarkComplete}
			variant={completed ? "secondary" : "primary"}
			size="md"
		>
			<Check size={16} weight="bold" />
			{completed ? "จบบทเรียนแล้ว" : "ทำเครื่องหมายว่าจบ"}
		</Button>
	);

	if (!completed && !canMarkComplete) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span tabIndex={0}>{button}</span>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					ดูบทเรียนให้ถึง 80% ก่อนทำเครื่องหมายจบได้
				</TooltipContent>
			</Tooltip>
		);
	}

	return button;
}

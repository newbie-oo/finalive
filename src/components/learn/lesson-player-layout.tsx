"use client";

import { useState } from "react";
import { MarkdownView } from "@/lib/markdown";
import { LessonClient } from "./lesson-client";
import { NotesPanel } from "./notes-panel";
import { formatDurationMinutes } from "@/lib/format";

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
	quizId: string | null;
	isAdmin?: boolean;
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
	quizId,
	isAdmin = false,
	playerSlot,
}: LessonPlayerLayoutProps) {
	const [activeTab, setActiveTab] = useState<"content" | "notes">("content");

	return (
		<>
			{/* Player slot */}
			{playerSlot}

			{/* Mobile progress strip */}
			<div className="flex items-center gap-3 border-b border-(--border) px-4 py-3 lg:hidden">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-muted)">
					<div
						className="h-full rounded-full bg-(--primary)"
						style={{
							width: `${totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%`,
						}}
					/>
				</div>
				<span className="num text-caption font-semibold text-(--primary)">
					{totalLessons > 0
						? Math.round((doneLessons / totalLessons) * 100)
						: 0}
					%
				</span>
			</div>

			{/* Tabs + body */}
			<div className="px-4 py-5 pb-8 lg:px-8 lg:py-8 lg:pb-12 max-w-[720px] mx-auto">
				{/* Tabs */}
				<div
					className="flex gap-6 border-b border-(--border) mb-6"
					role="tablist"
					aria-label="บทเรียน"
				>
					<button
						role="tab"
						aria-selected={activeTab === "content"}
						aria-current={activeTab === "content" ? "page" : undefined}
						onClick={() => setActiveTab("content")}
						className={`border-b-2 px-0 py-3 text-ui font-medium transition-colors ${
							activeTab === "content"
								? "border-(--primary) text-(--primary)"
								: "border-transparent text-(--foreground-muted) hover:text-(--foreground)"
						}`}
					>
						เนื้อหา
					</button>
					<button
						role="tab"
						aria-selected={activeTab === "notes"}
						aria-current={activeTab === "notes" ? "page" : undefined}
						onClick={() => setActiveTab("notes")}
						className={`border-b-2 px-0 py-3 text-ui font-medium transition-colors ${
							activeTab === "notes"
								? "border-(--primary) text-(--primary)"
								: "border-transparent text-(--foreground-muted) hover:text-(--foreground)"
						}`}
					>
						โน้ต
					</button>
				</div>

				{activeTab === "notes" ? (
					<NotesPanel lessonId={lessonId} />
				) : (
					<>
						{/* Lesson body */}
						<article>
							<h1 className="text-h2" style={{ margin: "0 0 8px" }}>
								{lessonTitle}
							</h1>
							<div className="flex flex-wrap items-center gap-3 mb-6 text-(--foreground-muted)">
								<span className="text-caption flex items-center gap-1">
									<span className="num">
										{formatDurationMinutes(durationSeconds)}
									</span>
								</span>
								<span style={{ color: "var(--border-strong)" }}>·</span>
								<span className="text-caption">{moduleTitle}</span>
							</div>

							{lessonBodyMd && (
								<div className="prose-style">
									<MarkdownView text={lessonBodyMd} />
								</div>
							)}
						</article>

						<LessonClient
							lessonId={lessonId}
							courseSlug={courseSlug}
							nextLessonId={nextLessonId}
							quizId={quizId}
							durationSeconds={durationSeconds}
							isAdmin={isAdmin}
						/>
					</>
				)}
			</div>
		</>
	);
}

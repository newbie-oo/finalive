"use client";

import { useEffect, useMemo, useState } from "react";

interface ProgressItem {
	lessonId: string;
	status: string;
}

interface Module {
	id: string;
	lessons: Array<{ id: string; durationSeconds: number | null }>;
}

interface UseCurriculumProgressResult {
	progressMap: Map<string, string>;
	doneCount: number;
	lessonCount: number;
	progressPct: number;
	remainingSeconds: number;
}

/**
 * Computes curriculum progress from server progress + optimistic local state.
 */
export function useCurriculumProgress(
	modules: Module[],
	progress: ProgressItem[],
	totalLessons?: number,
): UseCurriculumProgressResult {
	// Optimistic set of lessonIds marked completed locally so the sidebar
	// reacts immediately without waiting for a server round-trip / reload.
	const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent).detail as
				| { lessonId: string }
				| undefined;
			if (detail?.lessonId) {
				setOptimisticIds((prev) => new Set(prev).add(detail.lessonId));
			}
		};
		window.addEventListener("lesson-marked-complete", handler);
		return () => window.removeEventListener("lesson-marked-complete", handler);
	}, []);

	const progressMap = useMemo(() => {
		const map = new Map(progress.map((p) => [p.lessonId, p.status]));
		for (const id of optimisticIds) {
			map.set(id, "completed");
		}
		return map;
	}, [progress, optimisticIds]);

	const lessonCount =
		totalLessons ?? modules.reduce((acc, m) => acc + m.lessons.length, 0);

	const doneCount = useMemo(() => {
		let count = 0;
		for (const mod of modules) {
			for (const les of mod.lessons) {
				if (progressMap.get(les.id) === "completed") count++;
			}
		}
		return count;
	}, [modules, progressMap]);

	const progressPct =
		lessonCount > 0 ? Math.round((doneCount / lessonCount) * 100) : 0;

	const remainingSeconds = useMemo(() => {
		let total = 0;
		for (const mod of modules) {
			for (const les of mod.lessons) {
				if (progressMap.get(les.id) !== "completed" && les.durationSeconds) {
					total += les.durationSeconds;
				}
			}
		}
		return total;
	}, [modules, progressMap]);

	return { progressMap, doneCount, lessonCount, progressPct, remainingSeconds };
}

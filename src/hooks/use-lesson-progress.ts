"use client";

import { useCallback, useRef, useState } from "react";

interface UseLessonProgressOptions {
	lessonId: string | undefined;
	/** When true, suppress all progress writes. */
	suppressProgress?: boolean;
}

interface UseLessonProgressReturn {
	/** Save progress at the given second mark. Throttled to once per 10s. */
	saveProgress: (seconds: number) => void;
	/** Mark lesson as complete and dispatch completion event. */
	markComplete: () => void;
	/** Whether the lesson has been marked complete in this session. */
	isCompleted: boolean;
	/** Reset completion state (e.g. for replay). */
	resetComplete: () => void;
}

/**
 * Encapsulates lesson progress persistence and completion logic.
 * Reusable across video, text, and quiz lessons.
 */
export function useLessonProgress({
	lessonId,
	suppressProgress = false,
}: UseLessonProgressOptions): UseLessonProgressReturn {
	const lastSaveRef = useRef(0);
	const [isCompleted, setIsCompleted] = useState(false);

	const saveProgress = useCallback(
		(seconds: number) => {
			if (!lessonId || suppressProgress) return;
			const now = Date.now();
			if (now - lastSaveRef.current < 10_000) return;
			lastSaveRef.current = now;
			fetch("/api/learn/progress", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					lessonId,
					watchedSeconds: Math.floor(seconds),
				}),
			}).catch(() => {});
		},
		[lessonId, suppressProgress],
	);

	const markComplete = useCallback(() => {
		if (!lessonId || suppressProgress || isCompleted) return;
		setIsCompleted(true);
		fetch("/api/learn/progress", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ lessonId, watchedSeconds: 999_999 }),
		})
			.then(() => {
				window.dispatchEvent(
					new CustomEvent("lesson-completed", { detail: { lessonId } }),
				);
			})
			.catch(() => {});
	}, [lessonId, suppressProgress, isCompleted]);

	const resetComplete = useCallback(() => {
		setIsCompleted(false);
	}, []);

	return { saveProgress, markComplete, isCompleted, resetComplete };
}

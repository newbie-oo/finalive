"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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

const SAVE_THROTTLE_MS = 10_000;

interface ProgressPayload {
	lessonId: string;
	watchedSeconds: number;
	markComplete?: boolean;
}

async function postProgress(payload: ProgressPayload): Promise<void> {
	const res = await fetch("/api/learn/progress", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		throw new Error(`progress POST failed: ${res.status}`);
	}
}

/**
 * Encapsulates lesson progress persistence and completion logic.
 * Reusable across video, text, and quiz lessons.
 *
 * Server writes go through TanStack `useMutation` so failures are
 * observable (toast) and the loading/error state can be inspected by
 * callers later without changing the surface API.
 */
export function useLessonProgress({
	lessonId,
	suppressProgress = false,
}: UseLessonProgressOptions): UseLessonProgressReturn {
	const lastSaveRef = useRef(0);
	const [isCompleted, setIsCompleted] = useState(false);

	const saveMutation = useMutation({
		mutationFn: postProgress,
		// Watched-seconds writes are best-effort; toast only on completion.
	});

	const completeMutation = useMutation({
		mutationFn: postProgress,
		onSuccess: (_data, variables) => {
			window.dispatchEvent(
				new CustomEvent("lesson-completed", {
					detail: { lessonId: variables.lessonId },
				}),
			);
		},
		onError: () => {
			// Roll back optimistic completion so the user can retry.
			setIsCompleted(false);
			toast.error("บันทึกความคืบหน้าไม่สำเร็จ ลองใหม่อีกครั้ง");
		},
	});

	const saveProgress = useCallback(
		(seconds: number) => {
			if (!lessonId || suppressProgress) return;
			const now = Date.now();
			if (now - lastSaveRef.current < SAVE_THROTTLE_MS) return;
			lastSaveRef.current = now;
			saveMutation.mutate({
				lessonId,
				watchedSeconds: Math.floor(seconds),
			});
		},
		[lessonId, suppressProgress, saveMutation],
	);

	const markComplete = useCallback(() => {
		if (!lessonId || suppressProgress || isCompleted) return;
		setIsCompleted(true);
		completeMutation.mutate({
			lessonId,
			watchedSeconds: 0,
			markComplete: true,
		});
	}, [lessonId, suppressProgress, isCompleted, completeMutation]);

	const resetComplete = useCallback(() => {
		setIsCompleted(false);
	}, []);

	return { saveProgress, markComplete, isCompleted, resetComplete };
}

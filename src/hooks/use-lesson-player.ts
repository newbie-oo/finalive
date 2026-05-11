"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Fraction of duration the student must watch before they can self-mark a
 * lesson complete. Below this they see a disabled button with a tooltip
 * explaining why; admins bypass it for QA. */
const COMPLETE_THRESHOLD = 0.8;

export interface UseLessonPlayerOptions {
	lessonId: string;
	durationSeconds: number | null;
	watchedSeconds?: number;
	isAdmin?: boolean;
	isCompleted?: boolean;
}

export interface UseLessonPlayerResult {
	activeTab: "content" | "notes" | "qna";
	setActiveTab: (tab: "content" | "notes" | "qna") => void;
	completed: boolean;
	canMarkComplete: boolean;
	markComplete: () => Promise<void>;
}

export function useLessonPlayer({
	lessonId,
	durationSeconds,
	watchedSeconds = 0,
	isAdmin = false,
	isCompleted = false,
}: UseLessonPlayerOptions): UseLessonPlayerResult {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"content" | "notes" | "qna">(
		"content",
	);
	const [localCompleted, setLocalCompleted] = useState(false);
	const completed = localCompleted || isCompleted;

	const watchThresholdMet =
		!durationSeconds ||
		durationSeconds <= 0 ||
		watchedSeconds >= durationSeconds * COMPLETE_THRESHOLD;
	const canMarkComplete = isAdmin || watchThresholdMet;

	const markComplete = useCallback(async () => {
		if (isAdmin) {
			toast.info("admin preview — ไม่บันทึกความคืบหน้า");
			return;
		}
		try {
			const res = await fetch("/api/learn/progress", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					lessonId,
					watchedSeconds: durationSeconds ?? 0,
					markComplete: true,
					durationSeconds: durationSeconds ?? undefined,
				}),
			});
			if (!res.ok) throw new Error("failed");
			setLocalCompleted(true);
			toast.success("จบบทเรียนแล้ว");
			router.refresh();
		} catch {
			toast.error("บันทึกไม่สำเร็จ");
		}
	}, [isAdmin, lessonId, durationSeconds, router]);

	return {
		activeTab,
		setActiveTab,
		completed,
		canMarkComplete,
		markComplete,
	};
}

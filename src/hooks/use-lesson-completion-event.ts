"use client";

import { useEffect } from "react";

export function useLessonCompletionEvent({
	lessonId,
	onCompleted,
}: {
	lessonId: string;
	onCompleted: () => void;
}) {
	useEffect(() => {
		const handler = (e: Event) => {
			const custom = e as CustomEvent;
			if (custom.detail?.lessonId === lessonId) {
				onCompleted();
			}
		};
		window.addEventListener("lesson-completed", handler);
		return () => window.removeEventListener("lesson-completed", handler);
	}, [lessonId, onCompleted]);
}

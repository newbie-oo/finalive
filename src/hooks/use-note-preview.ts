"use client";

import { useMemo } from "react";

const NOTE_PREFIX = "finalive-notes-";
const PREVIEW_LEN = 80;

/** Read the most-recent local-storage note for a given user + lesson. */
export function useNotePreview(userId: string, lessonId: string): string {
	return useMemo(() => {
		if (typeof window === "undefined") return "";
		if (!userId || !lessonId) return "";
		try {
			const key = `${NOTE_PREFIX}${userId}-${lessonId}`;
			const val = localStorage.getItem(key) || "";
			return val.length > PREVIEW_LEN ? `${val.slice(0, PREVIEW_LEN)}…` : val;
		} catch {
			return "";
		}
	}, [userId, lessonId]);
}

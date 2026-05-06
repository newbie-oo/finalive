"use client";

import { useMemo } from "react";

const NOTE_PREFIX = "finalive-notes-";
const PREVIEW_LEN = 80;

/** Read the most-recent local-storage note for a given lesson. */
export function useNotePreview(lessonId: string): string {
	return useMemo(() => {
		if (typeof window === "undefined") return "";
		try {
			const keys = Object.keys(localStorage);
			const noteKey = keys.find(
				(k) => k.startsWith(NOTE_PREFIX) && k.endsWith(`-${lessonId}`),
			);
			if (!noteKey) return "";
			const val = localStorage.getItem(noteKey) || "";
			return val.length > PREVIEW_LEN ? `${val.slice(0, PREVIEW_LEN)}…` : val;
		} catch {
			return "";
		}
	}, [lessonId]);
}

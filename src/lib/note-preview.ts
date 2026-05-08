const NOTE_PREFIX = "finalive-notes-";
const PREVIEW_LEN = 80;

/**
 * Read the most-recent local-storage note for a given user + lesson and
 * return the first `PREVIEW_LEN` characters with an ellipsis if truncated.
 *
 * This used to be a `useNotePreview` hook wrapping `useMemo`, but the
 * function has no state and no effect — the parent component already
 * re-renders when `userId` / `lessonId` change. A plain function reads
 * better and is trivial to unit-test.
 */
export function getNotePreview(userId: string, lessonId: string): string {
	if (typeof window === "undefined") return "";
	if (!userId || !lessonId) return "";
	try {
		const key = `${NOTE_PREFIX}${userId}-${lessonId}`;
		const val = localStorage.getItem(key) || "";
		return val.length > PREVIEW_LEN ? `${val.slice(0, PREVIEW_LEN)}…` : val;
	} catch {
		return "";
	}
}

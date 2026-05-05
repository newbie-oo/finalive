import { publicUrl } from "@/lib/r2-url";

/**
 * Build a public cover image URL from a media asset storage key.
 * Returns null when no storage key is provided.
 *
 * SERVER-ONLY: calls publicUrl() which reads process.env. Do not import this
 * into Client Components. Pre-compute the URL in the repo / Server Component
 * layer and pass the resolved string as a prop instead.
 */
export function coverImageUrl(
	storageKey: string | null | undefined,
): string | null {
	if (!storageKey) return null;
	// Defensive: some legacy rows store the full path; most store just the uuid.
	const key = storageKey.startsWith("covers/")
		? storageKey
		: `covers/${storageKey}-640.webp`;
	return publicUrl(key);
}

/**
 * Pure helper: builds a cover image URL given a base CDN URL and storage key.
 * Safe to use anywhere (including Client Components) because the base URL is
 * passed in — no process.env access.
 */
export function buildCoverImageUrl(
	baseUrl: string,
	storageKey: string | null | undefined,
): string | null {
	if (!storageKey) return null;
	const key = storageKey.startsWith("covers/")
		? storageKey
		: `covers/${storageKey}-640.webp`;
	return `${baseUrl.replace(/\/$/, "")}/${encodeURI(key)}`;
}

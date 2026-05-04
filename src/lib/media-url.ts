import { publicUrl } from "@/lib/r2-url";

/**
 * Build a public cover image URL from a media asset storage key.
 * Returns null when no storage key is provided.
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

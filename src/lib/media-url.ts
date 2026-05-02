import { publicUrl } from "@/lib/r2-url";

/**
 * Build a public cover image URL from a media asset storage key.
 * Returns null when no storage key is provided.
 */
export function coverImageUrl(
	storageKey: string | null | undefined,
): string | null {
	if (!storageKey) return null;
	return publicUrl(`covers/${storageKey}-640.webp`);
}

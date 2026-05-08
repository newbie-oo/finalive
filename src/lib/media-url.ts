import { publicUrl } from "@/lib/r2-url";
import { coverKey } from "@/lib/storage-keys";

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
    : coverKey(storageKey, 640);
  return publicUrl(key);
}

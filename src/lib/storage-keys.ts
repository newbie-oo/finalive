/**
 * Centralised object-storage key builders.
 *
 * Goal: every layer (upload route, cleanup service, public-URL helper)
 * agrees on the exact same key shape. Drifting "covers/${uuid}-640.webp"
 * literals scattered across the codebase is how cleanup misses files.
 */

export const COVER_SIZES = [640, 1200] as const;
export type CoverSize = (typeof COVER_SIZES)[number];

/** `covers/{uuid}-{size}.webp` — the standard cover-image key. */
export function coverKey(uuid: string, size: CoverSize): string {
  return `covers/${uuid}-${size}.webp`;
}

/** All cover keys for a uuid (one per declared size). */
export function coverKeys(uuid: string): string[] {
  return COVER_SIZES.map((size) => coverKey(uuid, size));
}

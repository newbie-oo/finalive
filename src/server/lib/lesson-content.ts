import "server-only";

/**
 * Markers that the seed script writes into every fresh lesson body. A real
 * lesson body must NOT contain these — they are filler used during scaffolding
 * and would mislead paying students if shipped to production.
 */
const PLACEHOLDER_MARKERS = [
  "ภาพรวมของหัวข้อ และวิธีนำไปใช้จริง",
  "เครื่องมือที่ต้องเตรียม และคำแนะนำการเซ็ตอัป",
  "ตัวอย่างพร้อมโค้ด/แบบฝึกหัดท้ายบท",
] as const;

/**
 * Minimum number of meaningful characters a lesson body must contain after
 * stripping markdown punctuation. Below this we assume the lesson hasn't been
 * authored yet, regardless of whether the placeholder markers are present.
 */
const MIN_BODY_CHARS = 80;

export function isPlaceholderBody(body: string | null | undefined): boolean {
  if (!body) return false;
  return PLACEHOLDER_MARKERS.some((m) => body.includes(m));
}

export function isInsufficientBody(body: string | null | undefined): boolean {
  if (!body) return true;
  // Strip markdown punctuation + whitespace before counting.
  const stripped = body
    .replace(/[#>\-*_`~|>\[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length < MIN_BODY_CHARS;
}

export const __testing = { PLACEHOLDER_MARKERS, MIN_BODY_CHARS };

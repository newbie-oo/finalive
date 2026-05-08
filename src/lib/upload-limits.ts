/**
 * Shared upload limits and accept lists.
 *
 * Centralised here so the server (slip-upload-service, image-upload-service)
 * and the client UIs (slip dropzones, cover-image-upload, tiptap-editor)
 * agree on a single source of truth for the 5 MB cap and the allowed mime
 * surface. Server-side `file-sniff.ts` is still authoritative — these are
 * UX-level early filters.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** HTML `accept` attribute for slip uploads (image + PDF + HEIC). */
export const SLIP_ACCEPT =
	"image/png,image/jpeg,image/heic,image/heif,application/pdf,.heic,.heif";

/** HTML `accept` attribute for plain image uploads (covers, lesson images). */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

/** True when a browser-reported MIME counts as a valid slip type. */
export function isSlipMimeAllowed(file: File): boolean {
	const mime = file.type;
	const looksHeic =
		/\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(mime);
	return mime.startsWith("image/") || mime === "application/pdf" || looksHeic;
}

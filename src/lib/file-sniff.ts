// Detect actual file type from magic bytes; the browser-supplied MIME
// (file.type) is attacker-controlled and must not be trusted.

export type SniffedType = "image/png" | "image/jpeg" | "unknown";

export function sniffImageType(bytes: Buffer | Uint8Array): SniffedType {
  if (bytes.byteLength < 4) return "unknown";
  const b = bytes;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  // JPEG SOI: FF D8 FF (any third byte after FF D8)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  return "unknown";
}

/**
 * Slip uploads accept PNG, JPEG, PDF (bank-app exports), and HEIC/HEIF
 * (iPhone default). Anything else — including video MP4 ftyp boxes that
 * share HEIC's ISO BMFF container — must be rejected.
 *
 * Magic-byte detection only; never trust the browser MIME.
 */
export type SlipSniffedType =
  | "image/png"
  | "image/jpeg"
  | "image/heic"
  | "application/pdf"
  | "unknown";

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
]);

export function sniffSlipFile(bytes: Buffer | Uint8Array): SlipSniffedType {
  // Image types reuse the existing sniffer.
  const img = sniffImageType(bytes);
  if (img !== "unknown") return img;

  // PDF: starts with the literal "%PDF-".
  if (bytes.byteLength >= 5) {
    const b = bytes;
    if (
      b[0] === 0x25 &&
      b[1] === 0x50 &&
      b[2] === 0x44 &&
      b[3] === 0x46 &&
      b[4] === 0x2d
    ) {
      return "application/pdf";
    }
  }

  // HEIC / HEIF: ISO base media file format. Bytes 4-7 are "ftyp",
  // bytes 8-11 are the major brand. mp4/mov also use ftyp so we MUST
  // verify the brand; otherwise an attacker can rename a video to .heic.
  if (bytes.byteLength >= 12) {
    const b = bytes;
    if (
      b[4] === 0x66 && // 'f'
      b[5] === 0x74 && // 't'
      b[6] === 0x79 && // 'y'
      b[7] === 0x70 // 'p'
    ) {
      const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
      if (HEIC_BRANDS.has(brand)) return "image/heic";
    }
  }

  return "unknown";
}

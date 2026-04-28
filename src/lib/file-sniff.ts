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

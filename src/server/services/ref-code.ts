import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit O/0/I/1
const SUFFIX_LEN = 8;

export function generateRefCode(): string {
  const bytes = randomBytes(SUFFIX_LEN);
  let out = "FL-";
  for (let i = 0; i < SUFFIX_LEN; i += 1) {
    const idx = bytes[i]! % ALPHABET.length;
    out += ALPHABET[idx];
  }
  return out;
}

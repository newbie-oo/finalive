// Thai consonants -> RTGS-ish single-letter approximation, then strip.
// Rationale: Thai chars don't survive most URL slugifiers; this gives a
// deterministic, readable ASCII slug while still handling all-Thai titles.
const THAI_MAP: Record<string, string> = {
  ก: "k", ข: "kh", ฃ: "kh", ค: "kh", ฅ: "kh", ฆ: "kh", ง: "ng",
  จ: "ch", ฉ: "ch", ช: "ch", ซ: "s", ฌ: "ch", ญ: "y",
  ฎ: "d", ฏ: "t", ฐ: "th", ฑ: "th", ฒ: "th", ณ: "n",
  ด: "d", ต: "t", ถ: "th", ท: "th", ธ: "th", น: "n",
  บ: "b", ป: "p", ผ: "ph", ฝ: "f", พ: "ph", ฟ: "f", ภ: "ph", ม: "m",
  ย: "y", ร: "r", ล: "l", ว: "w",
  ศ: "s", ษ: "s", ส: "s", ห: "h", ฬ: "l", อ: "", ฮ: "h",
  ฤ: "rue", ฦ: "lue",
};

const THAI_VOWEL_MAP: Record<string, string> = {
  ะ: "a", "ั": "a", า: "a", "ำ": "am",
  "ิ": "i", "ี": "i", "ึ": "ue", "ื": "ue",
  "ุ": "u", "ู": "u",
  เ: "e", แ: "ae", โ: "o", ใ: "ai", ไ: "ai", ๅ: "a",
};

const THAI_TONES_AND_MARKS = new Set([
  "่", "้", "๊", "๋", "์", "ํ", "๎", "๏", "๚", "๛",
]);

const DIGIT_MAP: Record<string, string> = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9",
};

function transliterate(input: string): string {
  let out = "";
  for (const ch of input) {
    if (THAI_TONES_AND_MARKS.has(ch)) continue;
    if (THAI_MAP[ch] !== undefined) {
      out += THAI_MAP[ch];
      continue;
    }
    if (THAI_VOWEL_MAP[ch] !== undefined) {
      out += THAI_VOWEL_MAP[ch];
      continue;
    }
    if (DIGIT_MAP[ch] !== undefined) {
      out += DIGIT_MAP[ch];
      continue;
    }
    out += ch;
  }
  return out;
}

export function slugify(input: string): string {
  const transliterated = transliterate(input.normalize("NFKD"));
  // strip combining marks, lowercase, replace any non-alphanumeric run with '-'
  const ascii = transliterated
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return ascii.length > 0 ? ascii : "untitled";
}

export function uniqueSlug(base: string, existing: ReadonlySet<string>): string {
  const root = slugify(base);
  if (!existing.has(root)) return root;
  let i = 2;
  while (existing.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

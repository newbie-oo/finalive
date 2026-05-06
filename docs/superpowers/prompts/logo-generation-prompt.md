# Finalive Logo Generation Prompt

## สำหรับ Midjourney / DALL-E / Ideogram / GPT Image

---

### 🎯 Master Prompt (English — ใช้กับทุกเครื่องมือ)

```
A modern geometric monogram logo for "Finalive" — a Thai financial education platform.

The mark is a stylized letter "F" that subtly incorporates an upward-trend arrow or growth line, suggesting financial growth and learning progress. The design uses clean geometric construction with precise angles and consistent stroke weights.

Style characteristics:
- Minimalist, premium fintech aesthetic
- Bold confident lines, not thin or fragile
- Flat vector style, no gradients in the mark itself
- Rounded caps on strokes (2px radius) for approachability
- Square or slightly rounded-square container for the badge version
- Generous negative space — never crowded

Color palette (from the live UI):
- Primary: deep indigo #4F46E5
- Secondary: violet #7C3AED
- Accent: vibrant orange #F97316
- Neutral: dark navy text #1E1B4B on off-white #FBFBFD background

The logo must work at 24px (header) and 512px (social/OG image).

Show 4 variations:
1. Primary mark — indigo stroke on transparent
2. Badge version — indigo-to-violet gradient background with white mark
3. Dark mode inverse — white mark on dark navy #0B0B14
4. App icon / favicon — rounded-square with gradient bg

No text, no words, no typography — symbol only.
```

---

### 🎨 Midjourney-specific Prompt

```
Flat vector logo, geometric letter F monogram with upward arrow, fintech education brand, minimalist, deep indigo and violet color, clean lines, generous negative space, Behance, Dribbble, professional branding, square badge version with subtle gradient bg, isolated on white background --style raw --v 7 --ar 1:1
```

**Variations:**

- Dark mode: append `--no text typography wording`
- App icon: append `--ar 1:1` with "rounded square app icon, iOS style"

---

### 🤖 DALL-E 3 / GPT Image Prompt

```
Create a modern geometric logo mark (no text) for a financial education platform called Finalive.

The symbol should be a stylized letter "F" constructed from clean geometric lines. The vertical stem of the F should feel stable and grounded. The top horizontal bar should subtly transform into an upward-pointing arrow or growth trend line, communicating financial growth and upward progress.

Design specs:
- Pure flat vector, no shadows, no 3D
- Stroke weight: bold and confident
- Line caps: slightly rounded (not sharp, not fully circular)
- Color: deep indigo #4F46E5 for the stroke version
- Must feel premium, trustworthy, and modern — like a top-tier fintech app

Generate a 2×2 grid showing:
- Top-left: Stroke-only mark in indigo on white
- Top-right: Solid badge version with indigo-to-violet gradient background and white mark inside a rounded square
- Bottom-left: Dark mode version — white mark on dark navy background
- Bottom-right: Favicon version — small rounded-square icon at 32×32px scale
```

---

### 🇹🇭 Thai Prompt (สำหรับ AI ที่เข้าใจภาษาไทย เช่น Gemini Image)

```
ออกแบบโลโก้แบบมินิมอล ไม่มีตัวอักษร สำหรับแพลตฟอร์มสอนการเงิน "Finalive"

สัญลักษณ์เป็นอักษร "F" สไตล์เรขาคณิต ที่แฝงลูกศรชี้ขึ้น (แนวโน้มขึ้น) ในขีดบนสุด สื่อถึงการเติบโตทางการเงินและความก้าวหน้าในการเรียนรู้

สไตล์:
- เรียบง่าย ทันสมัย แบบแอป fintech ระดับพรีเมียม
- เส้นหนา มั่นคง ไม่บางหรือเปราะบาง
- หัวท้ายเส้นมนเล็กน้อย ดูเป็นมิตร
- พื้นที่ว่างมาก (negative space) ไม่แน่น

สี (จาก UI จริง):
- หลัก: น้ำเงินอินดิโก #4F46E5
- รอง: ม่วงไวโอเลต #7C3AED
- เน้น: ส้มสด #F97316
- พื้นหลัง: ขาวนวล #FBFBFD

แสดง 4 แบบ:
1. แบบเส้น (stroke) สีอินดิโก บนพื้นใส
2. แบadge สี่เหลี่ยมมน ไล่สีอินดิโก-ม่วง ตัว F สีขาว
3. โหมดมืด: ตัว F สีขาวบนพื้นกรมท่าเข้ม #0B0B14
4. ไอคอนแอป: ขนาดเล็ก 1:1 สำหรับ favicon
```

---

## 📋 Design System Reference (จาก Codebase)

| Token             | Value                      | ใช้ที่ไหน              |
| ----------------- | -------------------------- | ---------------------- |
| `--primary`       | `#4F46E5`                  | ปุ่มหลัก, ลิงก์, ไอคอน |
| `--primary-hover` | `#4338CA`                  | hover state            |
| `--accent`        | `#F97316`                  | CTA สำคัญ, ปุ่มเด่น    |
| `--background`    | `#FBFBFD`                  | พื้นหลังหลัก           |
| `--foreground`    | `#1E1B4B`                  | ตัวอักษรหลัก           |
| `--surface`       | `#FFFFFF`                  | card bg                |
| Dark bg           | `#0B0B14`                  | dark mode bg           |
| Card radius       | `14px`                     | ความมนของการ์ด         |
| Button radius     | `9999px` (pill)            | ปุ่ม CTA               |
| Font              | IBM Plex Sans Thai + Geist | ทั้งเว็บ               |

**Mood keywords:** Premium, approachable, trustworthy, modern, clean, geometric, growth-oriented

---

## 🚫 Do NOT Include

- ตัวอักษร "Finalive" ในโลโก้ (ต้องเป็น symbol ล้วน)
- รูปถุงเงิน, เหรียญ, ธนบัตร, หุ้นแท่ง — ดูเชย
- 3D, glassmorphism, neon glow
- ลูกศรที่ชี้ขึ้นแบบชัดเจนเกินไป (ต้องซ่อนในรูป F)
- สีเขียว (ใช้กับการเงินมากเกินไป)
- สีแดง (negative connotation)

---

## ✅ Success Criteria

1. เห็นเป็น "F" ได้ชัดใน 1 วินาที
2. รู้สึกถึงการเติบโต / ความก้าวหน้า โดยไม่ต้องอธิบาย
3. ดูดีที่ขนาด 16px (favicon) และ 512px (OG image)
4. แยกสีออกจากพื้นหลังได้ชัด (accessibility)
5. ไม่ซ้ำใคร — unique enough to trademark

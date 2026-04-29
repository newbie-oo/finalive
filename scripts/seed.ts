import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { user as userTable, account as accountTable } from "@/db/schema/auth";
import {
  course as courseTable,
  courseModule as moduleTable,
  lesson as lessonTable,
} from "@/db/schema/course";
import { quiz as quizTable, quizQuestion as quizQuestionTable, quizChoice as quizChoiceTable } from "@/db/schema/quiz";
import { mediaAsset as mediaAssetTable } from "@/db/schema/media";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@finalive.dev", name: "Admin", password: "change-me", role: "admin" },
  { email: "student-a@finalive.dev", name: "Student A", password: "change-me", role: "user" },
  { email: "student-b@finalive.dev", name: "Student B", password: "change-me", role: "user" },
];

interface SeedLesson {
  title: string;
  durationSeconds: number;
  isPreview?: boolean;
  isFree?: boolean;
  bodyMd?: string;
}
interface SeedModule {
  title: string;
  lessons: SeedLesson[];
}
interface SeedCourse {
  slug: string;
  title: string;
  summary: string;
  price: string;
  isFree?: boolean;
  modules: SeedModule[];
}

// Realistic finance/investing catalog mirroring claude-design-ui SAMPLE_COURSES.
// Brand is Finalive — a finance LMS — so demos and screenshots should look
// believable to a Thai finance professional. Slugs are stable because /courses
// pages are linked by slug; do not rename without checking outbound links.
const SEED_COURSES: SeedCourse[] = [
  {
    slug: "fin-statement-basics",
    title: "การวิเคราะห์งบการเงินขั้นพื้นฐาน",
    summary:
      "อ่านและตีความงบดุล งบกำไรขาดทุน และงบกระแสเงินสดของบริษัทจดทะเบียน — เน้นใช้งานจริงสำหรับนักลงทุนและคนทำงานสายการเงิน",
    price: "2490.00",
    modules: [
      {
        title: "ทำความรู้จักงบการเงิน",
        lessons: [
          { title: "งบการเงินคืออะไร และทำไมต้องอ่านเป็น", durationSeconds: 420, isPreview: true, isFree: true },
          { title: "งบดุล: สินทรัพย์ หนี้สิน ส่วนของผู้ถือหุ้น", durationSeconds: 540 },
          { title: "งบกำไรขาดทุน: รายได้ ต้นทุน กำไรสุทธิ", durationSeconds: 510 },
          { title: "งบกระแสเงินสด: 3 กิจกรรมที่ต้องเข้าใจ", durationSeconds: 600 },
        ],
      },
      {
        title: "อัตราส่วนทางการเงินที่สำคัญ",
        lessons: [
          { title: "Liquidity ratios (Current, Quick)", durationSeconds: 480 },
          { title: "Profitability ratios (ROE, ROA, Net margin)", durationSeconds: 540 },
          { title: "Leverage ratios (D/E, Interest coverage)", durationSeconds: 510 },
          { title: "Workshop: เปรียบเทียบ 2 บริษัทคู่แข่งจริง", durationSeconds: 720 },
        ],
      },
    ],
  },
  {
    slug: "thai-stock-30days",
    title: "เริ่มต้นลงทุนหุ้นไทยใน 30 วัน",
    summary:
      "เส้นทางจากศูนย์สู่นักลงทุนรายย่อยที่อ่านบริษัทเป็น เลือกหุ้นได้เอง และมีพอร์ตของตัวเอง — พร้อมเทมเพลต watchlist",
    price: "1990.00",
    modules: [
      {
        title: "พื้นฐานก่อนเปิดพอร์ต",
        lessons: [
          { title: "ตลาดหุ้นไทยทำงานยังไง — SET, mai, settlement", durationSeconds: 540, isPreview: true, isFree: true },
          { title: "เปิดพอร์ตกับโบรกเกอร์ และค่าธรรมเนียมที่ต้องรู้", durationSeconds: 420 },
          { title: "ประเภทหุ้น: growth / dividend / value", durationSeconds: 510 },
        ],
      },
      {
        title: "วิเคราะห์หุ้นรายตัว",
        lessons: [
          { title: "อ่านแบบ 56-1 One Report ใน 15 นาที", durationSeconds: 720 },
          { title: "P/E, P/BV, dividend yield ใช้ยังไงให้ถูก", durationSeconds: 540 },
          { title: "Workshop: เลือกหุ้น 3 ตัวเข้า watchlist", durationSeconds: 600 },
        ],
      },
    ],
  },
  {
    slug: "excel-finance",
    title: "Excel สำหรับนักวิเคราะห์การเงิน",
    summary:
      "คอร์สฟรีสอน Excel เฉพาะสำหรับงานการเงิน — สูตรที่ใช้จริง XLOOKUP, INDEX/MATCH, PMT, IRR, NPV และ pivot table",
    price: "0.00",
    isFree: true,
    modules: [
      {
        title: "สูตร Excel ที่ใช้จริงในงานการเงิน",
        lessons: [
          { title: "ทำไมต้องใช้ Excel ในงานการเงิน", durationSeconds: 300, isPreview: true, isFree: true },
          { title: "XLOOKUP กับ INDEX/MATCH ต่างกันยังไง", durationSeconds: 420, isFree: true },
          { title: "PMT, PV, FV — คำนวณเงินกู้และเงินออม", durationSeconds: 480, isFree: true },
          { title: "IRR และ NPV — ตัดสินใจลงทุนโครงการ", durationSeconds: 540, isFree: true },
        ],
      },
      {
        title: "จัดการข้อมูลเป็นมืออาชีพ",
        lessons: [
          { title: "Pivot Table แบบเข้าใจจริง ไม่ใช่จำสูตร", durationSeconds: 600, isFree: true },
          { title: "Workshop: ทำงบกำไรขาดทุนรายเดือนจาก raw data", durationSeconds: 720, isFree: true },
        ],
      },
    ],
  },
  {
    slug: "dcf-valuation",
    title: "DCF Valuation ขั้นสูง สำหรับคนทำงานจริง",
    summary:
      "ประเมินมูลค่าหุ้นและธุรกิจด้วยวิธี Discounted Cash Flow แบบที่นักวิเคราะห์มืออาชีพใช้จริง พร้อม Excel template ที่ทำงานได้ทันที",
    price: "3990.00",
    modules: [
      {
        title: "พื้นฐาน DCF",
        lessons: [
          { title: "Time value of money และ discount rate", durationSeconds: 480, isPreview: true, isFree: true },
          { title: "WACC: คำนวณยังไงให้ถูกต้อง", durationSeconds: 600 },
          { title: "Free Cash Flow to Firm vs to Equity", durationSeconds: 540 },
        ],
      },
      {
        title: "สร้างโมเดล DCF จริง",
        lessons: [
          { title: "Forecast revenue และ margins 5 ปี", durationSeconds: 720 },
          { title: "Working capital และ CapEx assumptions", durationSeconds: 660 },
          { title: "Terminal value: Gordon vs Exit multiple", durationSeconds: 600 },
          { title: "Sensitivity analysis และ scenario", durationSeconds: 540 },
          { title: "Workshop: ประเมินมูลค่าหุ้นจริงในตลาด", durationSeconds: 900 },
        ],
      },
    ],
  },
  {
    slug: "tax-planning-freelancer",
    title: "การวางแผนภาษีสำหรับฟรีแลนซ์และเจ้าของกิจการ",
    summary:
      "เข้าใจภาษีเงินได้บุคคลธรรมดา ภาษีหัก ณ ที่จ่าย VAT และวิธีลดหย่อนถูกกฎหมาย — สำหรับคนที่ไม่ได้เรียนบัญชีมาก่อน",
    price: "1490.00",
    modules: [
      {
        title: "ภาษีบุคคลธรรมดาฉบับเข้าใจง่าย",
        lessons: [
          { title: "เงินได้ 8 ประเภทตามมาตรา 40", durationSeconds: 540, isPreview: true, isFree: true },
          { title: "ค่าลดหย่อนที่คนส่วนใหญ่ไม่รู้", durationSeconds: 480 },
          { title: "ยื่น ภ.ง.ด. 90/91 ขั้นตอนละเอียด", durationSeconds: 600 },
        ],
      },
    ],
  },
];

/**
 * Generate a richer default Markdown body for any lesson that doesn't
 * supply its own bodyMd. Falls back from "Lorem placeholder" so seeded
 * pages don't look empty in screenshots and demos.
 */
function defaultLessonBody(courseTitle: string, moduleTitle: string, lessonTitle: string): string {
  return [
    `# ${lessonTitle}`,
    "",
    `> ${courseTitle} → ${moduleTitle}`,
    "",
    "## สิ่งที่จะได้เรียน",
    "- ภาพรวมของหัวข้อ และวิธีนำไปใช้จริง",
    "- เครื่องมือที่ต้องเตรียม และคำแนะนำการเซ็ตอัป",
    "- ตัวอย่างพร้อมโค้ด/แบบฝึกหัดท้ายบท",
    "",
    "## โน้ตประกอบ",
    "ดูวิดีโอประกอบด้านบน หากต้องการทบทวนสามารถกลับมาได้ตลอดเวลา ระบบจะจดจำตำแหน่งล่าสุด",
    "เพื่อให้คุณเรียนต่อได้ทันที",
    "",
    "## คำถามท้ายบท",
    "1. คุณคิดว่าหัวข้อนี้นำไปใช้ในงานจริงได้อย่างไร?",
    "2. มีจุดไหนที่อยากให้อาจารย์อธิบายเพิ่ม? เก็บไว้ถามใน Q&A",
  ].join("\n");
}

async function seedUsers(): Promise<string> {
  await db.execute(sql`TRUNCATE TABLE "account", "session", "verification", "user" CASCADE`);

  let adminId = "";
  for (const u of SEED_USERS) {
    const id = randomUUID();
    if (u.role === "admin") adminId = id;
    const hashed = await hashPassword(u.password);
    await db.insert(userTable).values({
      id,
      email: u.email,
      name: u.name,
      emailVerified: true,
      role: u.role,
    });
    await db.insert(accountTable).values({
      id: randomUUID(),
      userId: id,
      providerId: "credential",
      accountId: id,
      password: hashed,
    });
    console.warn(`[seed] inserted ${u.role.padEnd(5)} ${u.email}`);
  }
  if (!adminId) throw new Error("admin user not seeded");
  return adminId;
}

// Reusable Bunny Stream video for all seeded lessons.
// This is a real uploaded video (~4.5 min, 480x360) on Bunny Stream.
const MOCK_BUNNY_VIDEO_ID = "e749c35d-d564-48cb-b670-bbee94ffa68e";

async function seedCourses(adminId: string): Promise<string[]> {
  await db.execute(sql`TRUNCATE TABLE "media_asset", "quiz_choice", "quiz_question", "quiz", "lesson", "module", "course" CASCADE`);

  // Create one shared media asset for all lessons.
  const [sharedAsset] = await db.insert(mediaAssetTable).values({
    kind: "video",
    storage: "bunny_stream",
    storageKey: MOCK_BUNNY_VIDEO_ID,
    mimeType: "video/mp4",
    durationSeconds: 274,
    status: "ready",
    createdByUserId: adminId,
  }).returning({ id: mediaAssetTable.id });
  const sharedVideoMediaId = sharedAsset!.id;
  console.warn(`[seed] media asset ${sharedVideoMediaId} -> Bunny ${MOCK_BUNNY_VIDEO_ID}`);

  const lessonIds: string[] = [];
  const usedSlugs = new Set<string>();
  for (const c of SEED_COURSES) {
    const slug = c.slug;
    if (usedSlugs.has(slug)) throw new Error(`duplicate slug ${slug}`);
    usedSlugs.add(slug);

    const courseId = randomUUID();
    await db.insert(courseTable).values({
      id: courseId,
      slug,
      title: c.title,
      summary: c.summary,
      ownerUserId: adminId,
      price: c.price,
      isFree: c.isFree ?? false,
      status: "published",
      publishedAt: new Date(),
      createdByUserId: adminId,
    });

    for (let mi = 0; mi < c.modules.length; mi += 1) {
      const m = c.modules[mi]!;
      const moduleId = randomUUID();
      await db.insert(moduleTable).values({
        id: moduleId,
        courseId,
        title: m.title,
        sortOrder: mi + 1,
        createdByUserId: adminId,
      });

      for (let li = 0; li < m.lessons.length; li += 1) {
        const l = m.lessons[li]!;
        const lessonId = randomUUID();
        await db.insert(lessonTable).values({
          id: lessonId,
          moduleId,
          title: l.title,
          bodyMd: l.bodyMd ?? defaultLessonBody(c.title, m.title, l.title),
          videoMediaId: sharedVideoMediaId,
          durationSeconds: l.durationSeconds,
          isPreview: l.isPreview ?? false,
          isFree: l.isFree ?? false,
          sortOrder: li + 1,
          createdByUserId: adminId,
        });
        lessonIds.push(lessonId);
      }
    }
    console.warn(`[seed] course "${c.title}" -> /${slug}`);
  }
  return lessonIds;
}

async function seedQuizzes(adminId: string, lessonIds: string[]): Promise<void> {
  if (lessonIds.length === 0) return;

  // Quiz attached to lesson 1 of course 1 (การวิเคราะห์งบการเงินขั้นพื้นฐาน).
  const targetLessonId = lessonIds[0]!;
  const quizTitle = "แบบทดสอบท้ายบท: ทำความรู้จักงบการเงิน";
  const [qz] = await db.insert(quizTable).values({
    lessonId: targetLessonId,
    title: quizTitle,
    passScorePct: 60,
    createdByUserId: adminId,
  }).returning({ id: quizTable.id });

  const questions = [
    { prompt: "งบการเงินหลักที่บริษัทจดทะเบียนต้องเปิดเผยมีกี่งบ?", choices: [
      { body: "2 งบ", correct: false },
      { body: "3 งบ", correct: true },
      { body: "5 งบ", correct: false },
    ]},
    { prompt: "สมการบัญชีพื้นฐาน (Accounting equation) คืออะไร?", choices: [
      { body: "รายได้ = ต้นทุน + กำไร", correct: false },
      { body: "สินทรัพย์ = หนี้สิน + ส่วนของผู้ถือหุ้น", correct: true },
      { body: "กำไรสุทธิ = รายได้ − ค่าใช้จ่าย", correct: false },
    ]},
    { prompt: "งบกระแสเงินสดแบ่งกิจกรรมเป็นกี่ประเภท?", choices: [
      { body: "2 (ดำเนินงาน, ลงทุน)", correct: false },
      { body: "3 (ดำเนินงาน, ลงทุน, จัดหาเงิน)", correct: true },
      { body: "4 (ดำเนินงาน, ลงทุน, จัดหาเงิน, ภาษี)", correct: false },
    ]},
    { prompt: "ROE คืออัตราส่วนวัดอะไร?", choices: [
      { body: "ความสามารถสร้างกำไรเทียบกับสินทรัพย์", correct: false },
      { body: "ความสามารถสร้างกำไรเทียบกับส่วนของผู้ถือหุ้น", correct: true },
      { body: "ความสามารถจ่ายหนี้ระยะสั้น", correct: false },
    ]},
    { prompt: "ถ้า Current ratio < 1 หมายความว่าอย่างไร?", choices: [
      { body: "บริษัทกำลังเติบโต", correct: false },
      { body: "หนี้สินหมุนเวียนมากกว่าสินทรัพย์หมุนเวียน — เสี่ยงสภาพคล่อง", correct: true },
      { body: "บริษัทมีกำไรลดลง", correct: false },
    ]},
  ];

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi]!;
    const [qRow] = await db.insert(quizQuestionTable).values({
      quizId: qz!.id,
      promptMd: q.prompt,
      sortOrder: qi + 1,
    }).returning({ id: quizQuestionTable.id });

    for (let ci = 0; ci < q.choices.length; ci++) {
      const c = q.choices[ci]!;
      await db.insert(quizChoiceTable).values({
        questionId: qRow!.id,
        body: c.body,
        isCorrect: c.correct,
        sortOrder: ci + 1,
      });
    }
  }

  console.warn(`[seed] quiz "${quizTitle}" -> ${questions.length} questions`);
}

async function seedAppSettings(adminId: string): Promise<void> {
  const settings = [
    {
      key: "bank_account_display",
      valueJson: { text: "กสิกรไทย (KBank) • 123-4-56789-0 • บจ.ฟิเนไลฟ์ จำกัด" },
      description: "แสดงในหน้า /checkout",
      updatedByUserId: adminId,
    },
    {
      key: "promptpay_qr_image_url",
      // Admin uploads a PromptPay QR image and stores the public URL here.
      // Empty by default — the checkout page falls back to "โอนตามเลขบัญชี".
      valueJson: { url: "" },
      description: "URL ของรูป QR PromptPay ที่ admin อัปโหลดเอง",
      updatedByUserId: adminId,
    },
    {
      key: "cert_signature_image_url",
      valueJson: { text: "" },
      description: "รูป signature ลายเซ็น admin บน cert",
      updatedByUserId: adminId,
    },
    {
      key: "public_homepage_hero_text",
      valueJson: { th: "Finalive — เรียนรู้แบบเป็นระบบ" },
      description: "",
      updatedByUserId: adminId,
    },
  ];

  for (const s of settings) {
    await db.execute(sql`
      INSERT INTO app_setting (key, value_json, description, updated_by_user_id)
      VALUES (${s.key}, ${JSON.stringify(s.valueJson)}::jsonb, ${s.description}, ${adminId})
      ON CONFLICT (key) DO UPDATE SET
        value_json = EXCLUDED.value_json,
        description = EXCLUDED.description,
        updated_by_user_id = EXCLUDED.updated_by_user_id
    `);
  }
  console.warn("[seed] app_settings upserted");
}

async function seed(): Promise<void> {
  console.warn("[seed] starting");
  const adminId = await seedUsers();
  const lessonIds = await seedCourses(adminId);
  await seedQuizzes(adminId, lessonIds);
  await seedAppSettings(adminId);
  console.warn("[seed] done. Sign in with seed credentials (password = 'change-me').");
  process.exit(0);
}

seed().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[seed] failed:", msg);
  process.exit(1);
});

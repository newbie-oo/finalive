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
import { appSetting as appSettingTable } from "@/db/schema/app-setting";
import { slugify } from "@/lib/slug";

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
}
interface SeedModule {
  title: string;
  lessons: SeedLesson[];
}
interface SeedCourse {
  title: string;
  summary: string;
  price: string;
  isFree?: boolean;
  modules: SeedModule[];
}

const SEED_COURSES: SeedCourse[] = [
  {
    title: "Python For Investing",
    summary: "เริ่มต้น Python สำหรับการลงทุน — pandas, yfinance, backtest พื้นฐาน",
    price: "1290.00",
    modules: [
      {
        title: "พื้นฐาน Python",
        lessons: [
          { title: "ติดตั้ง Python + VSCode", durationSeconds: 360, isPreview: true, isFree: true },
          { title: "ตัวแปรและชนิดข้อมูล", durationSeconds: 540 },
          { title: "Loops และ List", durationSeconds: 600 },
        ],
      },
      {
        title: "การลงทุนด้วยข้อมูล",
        lessons: [
          { title: "ดาวน์โหลดราคาด้วย yfinance", durationSeconds: 480 },
          { title: "Backtest กลยุทธ์ง่ายๆ", durationSeconds: 720 },
        ],
      },
    ],
  },
  {
    title: "การออกแบบ UX สำหรับ B2B",
    summary: "framework ออกแบบ UX สำหรับ tool ภายในองค์กรและ SaaS B2B",
    price: "990.00",
    modules: [
      {
        title: "เข้าใจผู้ใช้องค์กร",
        lessons: [
          { title: "Stakeholder map", durationSeconds: 420, isPreview: true, isFree: true },
          { title: "Job stories vs user stories", durationSeconds: 540 },
        ],
      },
    ],
  },
  {
    title: "TypeScript Mastery",
    summary: "ลึกถึง type system ของ TS — generics, conditional, utility types",
    price: "1590.00",
    modules: [
      {
        title: "Type system",
        lessons: [
          { title: "Type vs Interface", durationSeconds: 480, isPreview: true, isFree: true },
          { title: "Generics", durationSeconds: 600 },
          { title: "Conditional types", durationSeconds: 720 },
        ],
      },
    ],
  },
  {
    title: "Free Intro Course",
    summary: "ตัวอย่างคอร์สฟรี เพื่อทดสอบโฟลว์การเรียนของแพลตฟอร์ม",
    price: "0.00",
    isFree: true,
    modules: [
      {
        title: "เริ่มต้น",
        lessons: [
          { title: "ภาพรวม", durationSeconds: 240, isPreview: true, isFree: true },
          { title: "เริ่มเรียน", durationSeconds: 360, isFree: true },
        ],
      },
    ],
  },
  {
    title: "Public Speaking ระดับมืออาชีพ",
    summary: "เทคนิคการพูดต่อหน้าสาธารณะ — โครงสร้างเรื่อง น้ำเสียง การควบคุมเวที",
    price: "790.00",
    modules: [
      {
        title: "โครงสร้างคำพูด",
        lessons: [
          { title: "Hook 30 วินาทีแรก", durationSeconds: 360, isPreview: true, isFree: true },
          { title: "การปิด: call to action", durationSeconds: 420 },
        ],
      },
    ],
  },
];

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

async function seedCourses(adminId: string): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course" CASCADE`);

  const usedSlugs = new Set<string>();
  for (const c of SEED_COURSES) {
    const slug = slugify(c.title);
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
        await db.insert(lessonTable).values({
          id: randomUUID(),
          moduleId,
          title: l.title,
          bodyMd: `# ${l.title}\n\nเนื้อหา placeholder สำหรับ seed.`,
          durationSeconds: l.durationSeconds,
          isPreview: l.isPreview ?? false,
          isFree: l.isFree ?? false,
          sortOrder: li + 1,
          createdByUserId: adminId,
        });
      }
    }
    console.warn(`[seed] course "${c.title}" -> /${slug}`);
  }
}

async function seedAppSettings(adminId: string): Promise<void> {
  await db.insert(appSettingTable).values([
    {
      key: "bank_account_display",
      valueJson: { text: "กสิกรไทย • 123-4-56789-0 • บจ.ฟิเนไลฟ์" },
      description: "แสดงในหน้า /checkout",
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
  ]);
  console.warn("[seed] app_settings inserted");
}

async function seed(): Promise<void> {
  console.warn("[seed] starting");
  const adminId = await seedUsers();
  await seedCourses(adminId);
  await seedAppSettings(adminId);
  console.warn("[seed] done. Sign in with seed credentials (password = 'change-me').");
  process.exit(0);
}

seed().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[seed] failed:", msg);
  process.exit(1);
});

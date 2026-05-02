/**
 * Real-media seed: realistic Bunny video + R2 covers, then attach.
 *
 *   pnpm seed:media
 *
 * What it does (idempotent — safe to re-run):
 *   1. Uploads the demo video at ../../uploads/video/test-video.mp4 to Bunny
 *      (reuses the existing media_asset by storageKey if already present).
 *   2. Attaches that video to **every** non-deleted lesson — not just preview
 *      lessons — so paid students also see a real HLS stream during demos.
 *      User feedback: "ใช้ video จริงด้วยนะ".
 *   3. Generates an SVG cover per course (indigo→violet gradient + course
 *      initial), uploads to R2 public bucket at covers/<slug>.svg, and links
 *      via course.cover_media_id. Replaces the empty placeholder boxes the
 *      user flagged ("course covers ยังเป็นกล่อง").
 *
 * Run after `pnpm seed`.
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson, course, courseModule } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";

// Standalone S3 client — src/server/services/r2.ts is "server-only" and can't
// be imported from a node script. Reads the same env vars.
function getS3(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

async function putObject(args: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const bucket = process.env.S3_BUCKET_PUBLIC;
  if (!bucket) throw new Error("S3_BUCKET_PUBLIC not set");
  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
}

const VIDEO_FILE = path.join(
  process.cwd(),
  "..",
  "..",
  "uploads",
  "video",
  "test-video.mp4",
);

async function uploadToBunny(filePath: string, title: string): Promise<string> {
  const apiKey = process.env.BUNNY_API_KEY;
  const lib = process.env.BUNNY_LIBRARY_ID;
  if (!apiKey || !lib) {
    throw new Error("BUNNY_API_KEY / BUNNY_LIBRARY_ID not set in env");
  }
  console.warn(`[seed:media] creating Bunny video "${title}"…`);
  const create = await fetch(
    `https://video.bunnycdn.com/library/${lib}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );
  if (!create.ok) {
    throw new Error(`Bunny create failed ${create.status}: ${await create.text()}`);
  }
  const { guid } = (await create.json()) as { guid: string };

  console.warn(`[seed:media] uploading ${filePath} → guid=${guid}…`);
  const buf = await readFile(filePath);
  const put = await fetch(
    `https://video.bunnycdn.com/library/${lib}/videos/${guid}`,
    {
      method: "PUT",
      headers: { AccessKey: apiKey, "content-type": "application/octet-stream" },
      body: buf,
    },
  );
  if (!put.ok) {
    throw new Error(`Bunny upload failed ${put.status}: ${await put.text()}`);
  }
  return guid;
}

// Two indigo/violet palette pairs alternated by course index, matching the
// claude-design-ui hero/featured-card gradient.
const COVER_PALETTES: Array<{ from: string; to: string; accent: string }> = [
  { from: "#312E81", to: "#1E1B4B", accent: "#F97316" },
  { from: "#4338CA", to: "#312E81", accent: "#FB923C" },
  { from: "#1E40AF", to: "#1E3A8A", accent: "#FBBF24" },
];

function svgCover(title: string, paletteIdx: number): string {
  const p = COVER_PALETTES[paletteIdx % COVER_PALETTES.length]!;
  const initial = (title.trim().charAt(0) || "F").toUpperCase();
  // 1600x900 → matches CourseCard's 16/9 aspect, wide enough that R2-served
  // SVG looks crisp at any responsive breakpoint Next/Image picks.
  // Inline base64 because R2's content-type sniff for raw text/svg+xml is
  // unreliable through some proxies — we set Content-Type explicitly on PUT.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.from}"/>
      <stop offset="100%" stop-color="${p.to}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.85" cy="0.85" r="0.4">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.15" cy="0.15" r="0.35">
      <stop offset="0%" stop-color="#818CF8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#818CF8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#glow1)"/>
  <rect width="1600" height="900" fill="url(#glow2)"/>
  <text x="80" y="180" fill="rgba(255,255,255,0.7)" font-family="IBM Plex Sans Thai, system-ui, sans-serif" font-size="28" font-weight="600" letter-spacing="6">FINALIVE</text>
  <text x="800" y="540" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-family="IBM Plex Sans Thai, system-ui, sans-serif" font-size="380" font-weight="700" letter-spacing="-12">${initial}</text>
  <text x="80" y="820" fill="rgba(255,255,255,0.85)" font-family="IBM Plex Sans Thai, system-ui, sans-serif" font-size="56" font-weight="600">${escapeXml(title)}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function ensureMediaAsset(
  args: { storageKey: string; storage: "bunny_stream" | "r2_public"; kind: "video" | "image"; mimeType: string; adminId: string },
): Promise<string> {
  const existing = (
    await db
      .select({ id: mediaAsset.id })
      .from(mediaAsset)
      .where(eq(mediaAsset.storageKey, args.storageKey))
      .limit(1)
  )[0];
  if (existing) return existing.id;
  const inserted = await db
    .insert(mediaAsset)
    .values({
      kind: args.kind,
      storage: args.storage,
      storageKey: args.storageKey,
      mimeType: args.mimeType,
      durationSeconds: null,
      status: "ready",
      createdByUserId: args.adminId,
    })
    .returning({ id: mediaAsset.id });
  return inserted[0]!.id;
}

async function attachVideoToAllLessons(adminId: string): Promise<void> {
  const guid = await uploadToBunny(VIDEO_FILE, "finalive-demo");
  console.warn(`[seed:media] Bunny upload OK guid=${guid}`);

  const assetId = await ensureMediaAsset({
    storageKey: guid,
    storage: "bunny_stream",
    kind: "video",
    mimeType: "video/mp4",
    adminId,
  });

  // Attach to every non-deleted lesson — paid students should also see a real
  // video, not just preview lessons. The shared asset is fine for the demo.
  const allLessons = await db
    .select({ id: lesson.id, title: lesson.title })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(sql`${lesson.deletedAt} IS NULL AND ${course.deletedAt} IS NULL`);

  console.warn(`[seed:media] attaching video to ${allLessons.length} lessons`);
  for (const l of allLessons) {
    await db
      .update(lesson)
      .set({ videoMediaId: assetId, updatedAt: new Date() })
      .where(eq(lesson.id, l.id));
  }
}

async function attachCoverToAllCourses(adminId: string): Promise<void> {
  const courses = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      coverMediaId: course.coverMediaId,
    })
    .from(course)
    .where(isNull(course.deletedAt));

  console.warn(`[seed:media] generating ${courses.length} cover WebPs → R2`);

  for (let i = 0; i < courses.length; i += 1) {
    const c = courses[i]!;
    // Skip if already has a cover — keeps re-runs cheap and preserves any
    // hand-uploaded covers from the admin UI.
    if (c.coverMediaId) {
      console.warn(`  - skip ${c.slug} (already has cover)`);
      continue;
    }

    // storageKey convention from src/app/api/upload/image/route.ts is a bare
    // UUID; the actual R2 path is covers/<uuid>-640.webp. course repo joins
    // on storageKey and rebuilds that URL, so we follow the same shape.
    const uuid = randomUUID();
    const key = `covers/${uuid}-640.webp`;
    const svg = svgCover(c.title, i);
    const webp = await sharp(Buffer.from(svg, "utf8"))
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();

    await putObject({
      key,
      body: webp,
      contentType: "image/webp",
    });
    const assetId = await ensureMediaAsset({
      storageKey: uuid,
      storage: "r2_public",
      kind: "image",
      mimeType: "image/webp",
      adminId,
    });
    await db
      .update(course)
      .set({ coverMediaId: assetId, updatedAt: new Date() })
      .where(eq(course.id, c.id));
    console.warn(`  ✓ cover ${c.slug} → ${key}`);
  }
}

async function main(): Promise<void> {
  const adminRow = (
    await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.role, "admin"))
      .limit(1)
  )[0];
  if (!adminRow) {
    throw new Error("no admin user found — run `pnpm seed` first");
  }
  const adminId = adminRow.id;

  await attachVideoToAllLessons(adminId);
  await attachCoverToAllCourses(adminId);

  console.warn("[seed:media] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:media] failed:", err);
  process.exit(1);
});

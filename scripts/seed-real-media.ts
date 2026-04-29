/**
 * One-off seed: upload one real video to Bunny + attach it to every
 * "preview" lesson across all seeded courses, so the /learn flow plays
 * a real HLS stream instead of showing the no-video placeholder.
 *
 * Run after `pnpm seed`:
 *   pnpm seed:media
 *
 * Idempotent: looks up existing media_asset by storageKey and reuses.
 * Safe to re-run.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { lesson, course, courseModule } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";

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

  // Upload the demo video once and reuse the asset everywhere.
  const guid = await uploadToBunny(VIDEO_FILE, "finalive-demo");
  console.warn(`[seed:media] Bunny upload OK guid=${guid}`);

  // Persist the media_asset (reuse existing if storage_key already present).
  const existing = (
    await db
      .select({ id: mediaAsset.id })
      .from(mediaAsset)
      .where(eq(mediaAsset.storageKey, guid))
      .limit(1)
  )[0];

  let assetId: string;
  if (existing) {
    assetId = existing.id;
  } else {
    const inserted = await db
      .insert(mediaAsset)
      .values({
        kind: "video",
        storage: "bunny_stream",
        storageKey: guid,
        mimeType: "video/mp4",
        durationSeconds: null,
        status: "ready",
        createdByUserId: adminId,
      })
      .returning({ id: mediaAsset.id });
    assetId = inserted[0]!.id;
  }

  // Attach to every preview/free lesson — those are the ones a non-enrolled
  // visitor can play. Authenticated enrolled students see all lessons but
  // a single video on the preview lessons is enough for a demo.
  const previewLessons = await db
    .select({ id: lesson.id, title: lesson.title })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      sql`(${lesson.isPreview} = true OR ${lesson.isFree} = true OR ${course.isFree} = true)
          AND ${lesson.deletedAt} IS NULL`,
    );

  console.warn(`[seed:media] attaching to ${previewLessons.length} preview/free lessons`);
  for (const l of previewLessons) {
    await db
      .update(lesson)
      .set({ videoMediaId: assetId, updatedAt: new Date() })
      .where(eq(lesson.id, l.id));
    console.warn(`  ✓ ${l.title}`);
  }
  console.warn("[seed:media] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:media] failed:", err);
  process.exit(1);
});

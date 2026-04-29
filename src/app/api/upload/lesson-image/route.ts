import { NextResponse } from "next/server";
import sharp from "sharp";
import { putObject, publicUrl } from "@/server/services/r2";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { getSession } from "@/server/auth-session";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "file_too_large", maxSize: MAX_SIZE },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize to a sensible max width for lesson content, convert to WebP
    const processed = await sharp(buffer)
      .resize(1920, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const uuid = crypto.randomUUID();
    const key = `lesson-images/${uuid}.webp`;

    await putObject({
      bucket: "public",
      key,
      body: processed,
      contentType: "image/webp",
    });

    const url = publicUrl(key);

    const [asset] = await db
      .insert(mediaAsset)
      .values({
        kind: "image",
        storage: "r2_public",
        storageKey: key,
        mimeType: "image/webp",
        status: "ready",
        createdByUserId: session.user.id,
      })
      .returning({ id: mediaAsset.id });

    return NextResponse.json({
      mediaAssetId: asset!.id,
      url,
    });
  } catch (err) {
    console.error("Lesson image upload failed:", err);
    return NextResponse.json(
      { error: "processing_failed" },
      { status: 500 }
    );
  }
}

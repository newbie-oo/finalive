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
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const [coverBuffer, ogBuffer] = await Promise.all([
      sharp(buffer).resize(640, 360, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
      sharp(buffer).resize(1200, 630, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
    ]);

    const uuid = crypto.randomUUID();
    const coverKey = `covers/${uuid}-640.webp`;
    const ogKey = `covers/${uuid}-1200.webp`;

    await Promise.all([
      putObject({ bucket: "public", key: coverKey, body: coverBuffer, contentType: "image/webp" }),
      putObject({ bucket: "public", key: ogKey, body: ogBuffer, contentType: "image/webp" }),
    ]);

    const [asset] = await db
      .insert(mediaAsset)
      .values({
        kind: "image",
        storage: "r2_public",
        storageKey: uuid,
        mimeType: "image/webp",
        status: "ready",
        createdByUserId: session.user.id,
      })
      .returning({ id: mediaAsset.id });

    return NextResponse.json({
      mediaAssetId: asset!.id,
      urls: {
        cover: publicUrl(coverKey),
        og: publicUrl(ogKey),
      },
    });
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

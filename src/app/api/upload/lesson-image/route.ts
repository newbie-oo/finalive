import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { getSession } from "@/server/auth-session";
import { R2ObjectStorage } from "@/server/services/storage";
import {
  ImageUploadService,
  ImageUploadError,
} from "@/server/services/image-upload";

const MAX_SIZE = 5 * 1024 * 1024;

function makeService() {
  const storage = new R2ObjectStorage("public");
  return new ImageUploadService({
    storage,
    maxSizeBytes: MAX_SIZE,
    processImage: async (buffer) => {
      const processed = await sharp(buffer)
        .resize(1920, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      const uuid = crypto.randomUUID();
      const key = `lesson-images/${uuid}.webp`;
      return [
        {
          buffer: processed,
          key,
          contentType: "image/webp",
          name: "default",
        },
      ];
    },
    createMediaAsset: async (args) => {
      const [row] = await db
        .insert(mediaAsset)
        .values({
          kind: "image",
          storage: "r2_public",
          storageKey: args.storageKey,
          mimeType: args.mimeType,
          status: "ready",
          createdByUserId: args.userId,
        })
        .returning({ id: mediaAsset.id });
      return { id: row!.id };
    },
  });
}

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const service = makeService();
    const result = await service.upload({
      bytes: buffer,
      userId: session.user.id,
    });

    return NextResponse.json({
      mediaAssetId: result.mediaAssetId,
      url: result.urls.default ?? "",
    });
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("Lesson image upload failed:", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

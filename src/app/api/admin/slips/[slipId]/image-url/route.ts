import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip } from "@/db/schema/payment";
import { mediaAsset } from "@/db/schema/media";
import { requireRole } from "@/server/auth-session";
import { presignReadUrl } from "@/server/services/r2";
import { ApiError, statusForCode } from "@/lib/api-error";

const SIGN_TTL_SECONDS = 600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slipId: string }> },
) {
  try {
    await requireRole("admin");
    const { slipId } = await params;
    const rows = await db
      .select({
        storageKey: mediaAsset.storageKey,
        storage: mediaAsset.storage,
        mimeType: mediaAsset.mimeType,
      })
      .from(paymentSlip)
      .innerJoin(mediaAsset, eq(paymentSlip.imageMediaId, mediaAsset.id))
      .where(eq(paymentSlip.id, slipId))
      .limit(1);

    const media = rows[0];
    if (!media) throw new ApiError("not_found", "slip not found");
    if (media.storage !== "r2_private") {
      throw new ApiError("invalid_state", "slip image is not in private storage");
    }

    const url = await presignReadUrl({
      bucket: "private",
      key: media.storageKey,
      expiresInSeconds: SIGN_TTL_SECONDS,
    });

    return NextResponse.json(
      { url, mimeType: media.mimeType, expiresInSeconds: SIGN_TTL_SECONDS },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    throw e;
  }
}

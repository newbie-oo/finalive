import { NextResponse } from "next/server";
import { uploadSlip } from "@/server/actions/slip";
import { requireSession } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";
import {
  checkRateLimit,
  getClientIP,
  rateLimitConfigs,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  await requireSession();
  const limit = checkRateLimit(
    getClientIP(req),
    "/api/slip/upload",
    rateLimitConfigs.upload,
  );
  if (!limit.allowed) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }

  const pendingId = formData.get("pendingId");
  const file = formData.get("slip");
  const reportedAmount = formData.get("reportedAmount");

  if (typeof pendingId !== "string" || pendingId.length === 0) {
    return NextResponse.json(
      { code: "validation_failed", message: "pendingId required" },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { code: "validation_failed", message: "slip file required" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadSlip({
      pendingId,
      bytes: buf,
      reportedAmount:
        typeof reportedAmount === "string" && reportedAmount.length > 0
          ? reportedAmount
          : undefined,
    });
    return NextResponse.redirect(
      new URL(`/checkout/${result.pendingId}/success`, req.url),
      303,
    );
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    console.error("slip/upload error:", e);
    throw e;
  }
}

import { NextResponse } from "next/server";
import { createPendingEnrollment } from "@/server/actions/enrollment";
import { ApiError, statusForCode } from "@/lib/api-error";
import { checkRateLimit, getClientIP, rateLimitConfigs } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = checkRateLimit(getClientIP(req), "/checkout/start", rateLimitConfigs.checkout);
  if (!limit.allowed) {
    return NextResponse.json({ code: "rate_limited" }, { status: 429 });
  }

  const body = (await req.formData()).get("courseSlug");
  if (typeof body !== "string" || body.length === 0) {
    return NextResponse.json({ code: "validation_failed" }, { status: 400 });
  }
  try {
    const result = await createPendingEnrollment(body);
    return NextResponse.redirect(new URL(`/checkout/${result.id}`, req.url), 303);
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    console.error("checkout/start error:", e);
    throw e;
  }
}

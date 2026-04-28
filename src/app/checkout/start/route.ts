import { NextResponse } from "next/server";
import { createPendingEnrollment } from "@/server/actions/enrollment";
import { ApiError, statusForCode } from "@/lib/api-error";

export async function POST(req: Request) {
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

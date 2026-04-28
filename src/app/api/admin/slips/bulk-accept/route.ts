import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkAcceptSlips } from "@/server/actions/admin-slip";
import { ApiError, statusForCode } from "@/lib/api-error";

const bodySchema = z.object({
  slipIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const json = (await req.json().catch(() => null)) as unknown;
    const { slipIds } = bodySchema.parse(json);
    const result = await bulkAcceptSlips(slipIds);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { code: "validation_failed", message: e.errors[0]?.message ?? "invalid body" },
        { status: 400 },
      );
    }
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    console.error("admin/slips/bulk-accept error:", e);
    throw e;
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkRejectSlips, REJECT_REASONS } from "@/server/actions/admin-slip";
import { requireRole } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";

const bodySchema = z.object({
  slipIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.enum(REJECT_REASONS),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  await requireRole("admin");
  try {
    const json = (await req.json().catch(() => null)) as unknown;
    const { slipIds, reason, note } = bodySchema.parse(json);
    const result = await bulkRejectSlips(slipIds, reason, note);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: "validation_failed",
          message: e.errors[0]?.message ?? "invalid body",
        },
        { status: 400 },
      );
    }
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    console.error("admin/slips/bulk-reject error:", e);
    throw e;
  }
}

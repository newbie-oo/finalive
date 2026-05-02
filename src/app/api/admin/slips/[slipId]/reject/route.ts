import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectSlip, REJECT_REASONS } from "@/server/actions/admin-slip";
import { requireRole } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";

const bodySchema = z.object({
  reason: z.enum(REJECT_REASONS),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slipId: string }> },
) {
  await requireRole("admin");
  try {
    const { slipId } = await params;
    const json = (await req.json().catch(() => null)) as unknown;
    const parsed = bodySchema.parse(json);
    const result = await rejectSlip({
      slipId,
      reason: parsed.reason,
      note: parsed.note,
    });
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
    console.error("admin/slips/reject error:", e);
    throw e;
  }
}

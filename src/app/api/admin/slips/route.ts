import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth-session";
import {
  listPendingSlips,
  type SlipQueueStatus,
} from "@/server/repos/slip";
import { ApiError, statusForCode } from "@/lib/api-error";

const STATUS_VALUES = ["submitted", "accepted", "rejected", "all"] as const satisfies readonly SlipQueueStatus[];
const querySchema = z.object({
  status: z.enum(STATUS_VALUES).default("submitted"),
  cursor: z.string().optional(),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams));
    const result = await listPendingSlips(parsed);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { code: "validation_failed", message: e.errors[0]?.message ?? "invalid query" },
        { status: 400 },
      );
    }
    throw e;
  }
}

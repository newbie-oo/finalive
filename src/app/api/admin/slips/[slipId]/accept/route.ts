import { NextResponse } from "next/server";
import { acceptSlip } from "@/server/actions/admin-slip";
import { requireRole } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slipId: string }> },
) {
  await requireRole("admin");
  try {
    const { slipId } = await params;
    const result = await acceptSlip(slipId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { code: e.code, message: e.message },
        { status: statusForCode(e.code) },
      );
    }
    console.error("admin/slips/accept error:", e);
    throw e;
  }
}

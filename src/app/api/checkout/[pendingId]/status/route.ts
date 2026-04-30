import { NextResponse } from "next/server";
import { getSession } from "@/server/auth-session";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ pendingId: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { pendingId } = await params;
  const pending = await getCheckoutPending(pendingId, session.user.id);
  if (!pending) {
    // Either gone or never belonged to this user.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    status: pending.status,
    courseSlug: pending.courseSlug,
    refCode: pending.refCode,
    amount: pending.amount,
  });
}

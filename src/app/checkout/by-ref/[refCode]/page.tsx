import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pendingEnrollment } from "@/db/schema/payment";
import { requireSession } from "@/server/auth-session";
import { isActionable } from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

export default async function CheckoutByRefPage({
  params,
}: {
  params: Promise<{ refCode: string }>;
}) {
  const { refCode } = await params;
  const { user } = await requireSession();

  const rows = await db
    .select({ id: pendingEnrollment.id, userId: pendingEnrollment.userId, status: pendingEnrollment.status })
    .from(pendingEnrollment)
    .where(eq(pendingEnrollment.refCode, refCode))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();
  if (row.userId !== user.id) {
    // Same 404 for security — don't leak existence
    notFound();
  }
  if (!isActionable(row.status)) {
    // Already paid / expired — send to enrollments
    redirect("/account/enrollments");
  }

  redirect(`/checkout/${row.id}`);
}

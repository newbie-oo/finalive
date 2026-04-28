"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { enrollment, adminGrant } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { sendGrantCourseEmail } from "@/server/services/mailer";
import { getEnv } from "@/lib/env";

const grantSchema = z.object({
  studentUserId: z.string().min(1),
  courseId: z.string().uuid(),
  reason: z.enum(["promo", "gift", "comp", "refund_replacement", "other"]),
  note: z.string().max(500).optional(),
});

export async function grantCourseAction(input: z.infer<typeof grantSchema>) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "unauthorized" as const };
  }

  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const { studentUserId, courseId, reason, note } = parsed.data;

  // Check existing active enrollment.
  const existing = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.userId, studentUserId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.status, "active"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, error: "already_enrolled" as const };
  }

  // Create admin grant.
  const [grant] = await db
    .insert(adminGrant)
    .values({
      adminUserId: session.user.id,
      studentUserId,
      courseId,
      reason,
      note: note ?? "",
    })
    .returning({ id: adminGrant.id });

  // Create enrollment.
  await db.insert(enrollment).values({
    userId: studentUserId,
    courseId,
    source: "admin_grant",
    sourceGrantId: grant!.id,
    status: "active",
  });

  // Send email notification.
  try {
    const studentRows = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, studentUserId))
      .limit(1);
    const student = studentRows[0];

    const courseRows = await db
      .select({ title: course.title, slug: course.slug })
      .from(course)
      .where(eq(course.id, courseId))
      .limit(1);
    const courseRow = courseRows[0];

    if (student && courseRow) {
      const env = getEnv();
      const learnUrl = `${env.BETTER_AUTH_URL}/learn/${courseRow.slug}`;
      await sendGrantCourseEmail({
        to: student.email,
        name: student.name,
        courseTitle: courseRow.title,
        learnUrl,
      });
    }
  } catch (err) {
    console.error("Failed to send grant email:", err);
  }

  return { ok: true };
}

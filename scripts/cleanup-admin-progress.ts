// Removes any lesson_progress / enrollment / certificate rows that may
// have been created for admin users during the pre-fix window before the
// admin bypass was wired in. Safe to run repeatedly.

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { user as userTable } from "@/db/schema/auth";
import { lessonProgress } from "@/db/schema/progress";
import { enrollment } from "@/db/schema/enrollment";
import { certificate } from "@/db/schema/certificate";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("refuse to run cleanup in production");
  }

  const admins = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.role, "admin"));

  const adminIds = admins.map((a) => a.id);
  if (adminIds.length === 0) {
    console.warn("[cleanup] no admin users found — nothing to do");
    return;
  }

  // 1. delete certificates that belong to enrollments owned by admins
  const adminEnrollments = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(inArray(enrollment.userId, adminIds));

  if (adminEnrollments.length > 0) {
    const enrollIds = adminEnrollments.map((e) => e.id);
    const delCerts = await db
      .delete(certificate)
      .where(inArray(certificate.enrollmentId, enrollIds))
      .returning({ id: certificate.id });
    console.warn(`[cleanup] deleted ${delCerts.length} certificate(s)`);

    const delEnrolls = await db
      .delete(enrollment)
      .where(inArray(enrollment.id, enrollIds))
      .returning({ id: enrollment.id });
    console.warn(`[cleanup] deleted ${delEnrolls.length} enrollment(s)`);
  }

  // 2. wipe lesson_progress rows for admins
  const delProg = await db
    .delete(lessonProgress)
    .where(inArray(lessonProgress.userId, adminIds))
    .returning({ id: lessonProgress.id });
  console.warn(`[cleanup] deleted ${delProg.length} lesson_progress row(s)`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { isUserEnrolledInCourse } from "@/server/repos/course";
import { requireSession } from "@/server/auth-session";
import { FreeEnrollmentService } from "@/server/services/free-enrollment";

export type { FreeEnrollmentResult } from "@/server/services/free-enrollment";

function makeService() {
  return new FreeEnrollmentService({
    getCourseBySlug: async (slug) => {
      const rows = await db
        .select({
          id: course.id,
          slug: course.slug,
          isFree: course.isFree,
          status: course.status,
        })
        .from(course)
        .where(eq(course.slug, slug))
        .limit(1);
      return rows[0];
    },
    findActiveEnrollment: isUserEnrolledInCourse,
    createEnrollment: async (args) => {
      await db.insert(enrollment).values({
        userId: args.userId,
        courseId: args.courseId,
        source: args.source,
        priceAtPurchase: args.priceAtPurchase,
        status: "active",
      });
    },
  });
}

export async function enrollFreeCourse(courseSlug: string) {
  const { user } = await requireSession("/login");
  const service = makeService();
  return service.enroll(user.id, courseSlug);
}

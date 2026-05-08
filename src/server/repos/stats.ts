import "server-only";
import { and, eq, sql, countDistinct } from "drizzle-orm";
import { coursePublic, notDeleted } from "@/db/predicates";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { courseModule } from "@/db/schema/course";
import { lesson } from "@/db/schema/course";

export interface PublicHomeStats {
  publishedCourses: number;
  activeStudents: number;
  publishedLessons: number;
}

/**
 * Trust-row stats shown on the homepage. Counts come from production data —
 * never substitute placeholder marketing numbers (auditors flagged the old
 * hardcoded "8,900+ นักเรียน" as misleading when only 2 existed).
 */
export async function getPublicHomeStats(): Promise<PublicHomeStats> {
  // Three independent counts — fan out in parallel so the page TTFB is one
  // DB roundtrip instead of three.
  const [[coursesRow], [studentsRow], [lessonsRow]] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(course)
      .where(coursePublic()),
    db
      .select({ value: countDistinct(enrollment.userId) })
      .from(enrollment)
      .where(eq(enrollment.status, "active")),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(lesson)
      .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
      .innerJoin(course, eq(courseModule.courseId, course.id))
      .where(
        and(
          coursePublic(),
          notDeleted(lesson),
          notDeleted(courseModule),
        ),
      ),
  ]);

  return {
    publishedCourses: coursesRow?.value ?? 0,
    activeStudents: Number(studentsRow?.value ?? 0),
    publishedLessons: lessonsRow?.value ?? 0,
  };
}

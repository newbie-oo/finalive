import "server-only";
import { and, eq, isNull, sql, countDistinct } from "drizzle-orm";
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
  const [coursesRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(course)
    .where(and(eq(course.status, "published"), isNull(course.deletedAt)));

  const [studentsRow] = await db
    .select({ value: countDistinct(enrollment.userId) })
    .from(enrollment)
    .where(eq(enrollment.status, "active"));

  const [lessonsRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      and(
        eq(course.status, "published"),
        isNull(lesson.deletedAt),
        isNull(courseModule.deletedAt),
        isNull(course.deletedAt),
      ),
    );

  return {
    publishedCourses: coursesRow?.value ?? 0,
    activeStudents: Number(studentsRow?.value ?? 0),
    publishedLessons: lessonsRow?.value ?? 0,
  };
}

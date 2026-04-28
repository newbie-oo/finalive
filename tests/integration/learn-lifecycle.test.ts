import { describe, it, expect, beforeEach } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { user as userTable } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress } from "@/db/schema/progress";
import {
  upsertLessonProgress,
  updateWatchedSeconds,
  markLessonComplete,
} from "@/server/repos/progress";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";

async function reset() {
  await db.execute(sql`
    TRUNCATE lesson_progress, enrollment, lesson, module, course,
      media_asset, "user" CASCADE
  `);
}

async function seedCourseWithLessons(opts: { lessonCount: number }) {
  const adminId = randomUUID();
  await db.insert(userTable).values({
    id: adminId,
    email: "admin@test",
    name: "Admin",
    role: "admin",
  });

  const [c] = await db
    .insert(course)
    .values({
      slug: "test-course",
      title: "Test Course",
      summary: "S",
      ownerUserId: adminId,
      status: "published",
      createdByUserId: adminId,
    })
    .returning({ id: course.id });

  const [mod] = await db
    .insert(courseModule)
    .values({
      courseId: c!.id,
      title: "Module 1",
      sortOrder: 1,
      createdByUserId: adminId,
    })
    .returning({ id: courseModule.id });

  const [ma] = await db
    .insert(mediaAsset)
    .values({
      kind: "video",
      storage: "bunny_stream",
      storageKey: randomUUID(),
      mimeType: "video/mp4",
      durationSeconds: 120,
      status: "ready",
      createdByUserId: adminId,
    })
    .returning({ id: mediaAsset.id });

  const lessons: string[] = [];
  for (let i = 0; i < opts.lessonCount; i++) {
    const [l] = await db
      .insert(lesson)
      .values({
        moduleId: mod!.id,
        title: `Lesson ${i + 1}`,
        sortOrder: i + 1,
        videoMediaId: ma!.id,
        durationSeconds: 120,
        createdByUserId: adminId,
      })
      .returning({ id: lesson.id });
    lessons.push(l!.id);
  }

  return { courseId: c!.id, lessonIds: lessons };
}

describe("learn lifecycle (enroll → watch → complete)", () => {
  beforeEach(reset);

  it("upserts lesson progress on start", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "s@test",
      name: "Student",
      role: "user",
    });

    const { courseId, lessonIds } = await seedCourseWithLessons({ lessonCount: 1 });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    await upsertLessonProgress(studentId, lessonIds[0]!);

    const rows = await db.select().from(lessonProgress);
    expect(rows.length).toBe(1);
    expect(rows[0]!.status).toBe("in_progress");
    expect(rows[0]!.watchedSeconds).toBe(0);
  });

  it("updates watched seconds", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "s@test",
      name: "Student",
      role: "user",
    });

    const { courseId, lessonIds } = await seedCourseWithLessons({ lessonCount: 1 });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    await upsertLessonProgress(studentId, lessonIds[0]!);
    await updateWatchedSeconds(studentId, lessonIds[0]!, 45);

    const [row] = await db
      .select({ watchedSeconds: lessonProgress.watchedSeconds })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, studentId),
          eq(lessonProgress.lessonId, lessonIds[0]!),
        ),
      );
    expect(row!.watchedSeconds).toBe(45);
  });

  it("marks lesson complete and sets enrollment.completed_at when all lessons done", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "s@test",
      name: "Student",
      role: "user",
    });

    const { courseId, lessonIds } = await seedCourseWithLessons({ lessonCount: 3 });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    // Complete first 2 lessons.
    for (let i = 0; i < 2; i++) {
      await upsertLessonProgress(studentId, lessonIds[i]!);
      await markLessonComplete(studentId, lessonIds[i]!);
      const { completed: done } = await checkAndMarkCourseComplete(studentId, courseId);
      expect(done).toBe(false);
    }

    // Verify enrollment not completed yet.
    const [before] = await db
      .select({ completedAt: enrollment.completedAt })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.userId, studentId),
          eq(enrollment.courseId, courseId),
        ),
      );
    expect(before!.completedAt).toBeNull();

    // Complete last lesson.
    await upsertLessonProgress(studentId, lessonIds[2]!);
    await markLessonComplete(studentId, lessonIds[2]!);
    const { completed: done, enrollmentId } = await checkAndMarkCourseComplete(studentId, courseId);
    expect(done).toBe(true);
    expect(enrollmentId).not.toBeNull();

    // Verify enrollment completed.
    const [after] = await db
      .select({ completedAt: enrollment.completedAt })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.userId, studentId),
          eq(enrollment.courseId, courseId),
        ),
      );
    expect(after!.completedAt).not.toBeNull();
  });

  it("returns false when no lessons exist in course", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "s@test",
      name: "Student",
      role: "user",
    });

    const { courseId } = await seedCourseWithLessons({ lessonCount: 0 });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    const { completed: done } = await checkAndMarkCourseComplete(studentId, courseId);
    expect(done).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import {
  upsertLessonProgress,
  updateWatchedSeconds,
  markLessonComplete,
} from "@/server/repos/progress";
import { getLearnCourse, getLearnLesson } from "@/server/repos/learn";

async function reset() {
  await db.execute(sql`
    TRUNCATE lesson_progress, enrollment, lesson, module, course,
      media_asset, "user" CASCADE
  `);
}

interface SeedShape {
  modules: { title: string; lessons: { title: string }[] }[];
}

async function seedCourse(slug: string, shape: SeedShape) {
  const adminId = randomUUID();
  await db.insert(userTable).values({
    id: adminId,
    email: `admin-${slug}@test`,
    name: "Admin",
    role: "admin",
  });

  const [c] = await db
    .insert(course)
    .values({
      slug,
      title: `Course ${slug}`,
      summary: "S",
      ownerUserId: adminId,
      status: "published",
      createdByUserId: adminId,
    })
    .returning({ id: course.id });

  const lessonIds: string[][] = [];
  for (let mi = 0; mi < shape.modules.length; mi++) {
    const m = shape.modules[mi]!;
    const [mod] = await db
      .insert(courseModule)
      .values({
        courseId: c!.id,
        title: m.title,
        sortOrder: mi + 1,
        createdByUserId: adminId,
      })
      .returning({ id: courseModule.id });

    const ids: string[] = [];
    for (let li = 0; li < m.lessons.length; li++) {
      const [l] = await db
        .insert(lesson)
        .values({
          moduleId: mod!.id,
          title: m.lessons[li]!.title,
          sortOrder: li + 1,
          bodyMd: "# body",
          durationSeconds: 60,
          createdByUserId: adminId,
        })
        .returning({ id: lesson.id });
      ids.push(l!.id);
    }
    lessonIds.push(ids);
  }

  return { courseId: c!.id, lessonIds };
}

describe("getLearnLesson — next lesson", () => {
  beforeEach(reset);

  it("returns the next lesson within the same module", async () => {
    const { lessonIds } = await seedCourse("c1", {
      modules: [{ title: "M1", lessons: [{ title: "L1" }, { title: "L2" }] }],
    });

    const res = await getLearnLesson("c1", lessonIds[0]![0]!);
    expect(res?.nextLessonId).toBe(lessonIds[0]![1]);
  });

  it("returns the first lesson of the next module when at end of a module", async () => {
    const { lessonIds } = await seedCourse("c2", {
      modules: [
        { title: "M1", lessons: [{ title: "L1" }, { title: "L2" }] },
        { title: "M2", lessons: [{ title: "L3" }] },
      ],
    });

    // Last lesson of module 1 should point to first lesson of module 2.
    const res = await getLearnLesson("c2", lessonIds[0]![1]!);
    expect(res?.nextLessonId).toBe(lessonIds[1]![0]);
  });

  it("returns null for the very last lesson", async () => {
    const { lessonIds } = await seedCourse("c3", {
      modules: [{ title: "M1", lessons: [{ title: "L1" }] }],
    });

    const res = await getLearnLesson("c3", lessonIds[0]![0]!);
    expect(res?.nextLessonId).toBeNull();
  });
});

describe("getLearnCourse — modules and resume", () => {
  beforeEach(reset);

  it("returns lessons scoped to the requested course only", async () => {
    await seedCourse("alpha", {
      modules: [{ title: "MA", lessons: [{ title: "A1" }] }],
    });
    await seedCourse("beta", {
      modules: [{ title: "MB", lessons: [{ title: "B1" }, { title: "B2" }] }],
    });

    const res = await getLearnCourse("alpha", null);
    expect(res?.modules.length).toBe(1);
    expect(res?.modules[0]!.lessons.map((l) => l.title)).toEqual(["A1"]);
  });

  it("resume picks the most recently updated in-progress lesson, not max-watched", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "stu@test",
      name: "S",
      role: "user",
    });

    const { courseId, lessonIds } = await seedCourse("c4", {
      modules: [
        { title: "M1", lessons: [{ title: "L1" }, { title: "L2" }, { title: "L3" }] },
      ],
    });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    // L1 watched 50s long ago.
    await upsertLessonProgress(studentId, lessonIds[0]![0]!);
    await updateWatchedSeconds(studentId, lessonIds[0]![0]!, 50);
    // L2 only watched 5s — but most recent.
    await new Promise((r) => setTimeout(r, 20));
    await upsertLessonProgress(studentId, lessonIds[0]![1]!);
    await updateWatchedSeconds(studentId, lessonIds[0]![1]!, 5);

    const res = await getLearnCourse("c4", studentId);
    expect(res?.resumeLessonId).toBe(lessonIds[0]![1]);
  });

  it("resume prefers in_progress over completed when both exist", async () => {
    const studentId = randomUUID();
    await db.insert(userTable).values({
      id: studentId,
      email: "stu2@test",
      name: "S",
      role: "user",
    });

    const { courseId, lessonIds } = await seedCourse("c5", {
      modules: [
        { title: "M1", lessons: [{ title: "L1" }, { title: "L2" }] },
      ],
    });
    await db.insert(enrollment).values({
      userId: studentId,
      courseId,
      source: "free_course",
      status: "active",
    });

    // L1 completed (long ago)
    await upsertLessonProgress(studentId, lessonIds[0]![0]!);
    await markLessonComplete(studentId, lessonIds[0]![0]!);
    // L2 in_progress (more recent)
    await new Promise((r) => setTimeout(r, 20));
    await upsertLessonProgress(studentId, lessonIds[0]![1]!);

    const res = await getLearnCourse("c5", studentId);
    expect(res?.resumeLessonId).toBe(lessonIds[0]![1]);
  });
});

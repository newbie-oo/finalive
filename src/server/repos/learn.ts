import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress } from "@/db/schema/progress";

export interface LearnLesson {
  id: string;
  title: string;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
}

export interface LearnModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LearnLesson[];
}

export interface LearnCourse {
  id: string;
  slug: string;
  title: string;
  isFree: boolean;
}

export interface LearnProgress {
  lessonId: string;
  status: string;
  watchedSeconds: number;
}

export interface GetLearnCourseResult {
  course: LearnCourse;
  modules: LearnModule[];
  isEnrolled: boolean;
  progress: LearnProgress[];
  resumeLessonId: string | null;
}

export async function getLearnCourse(
  courseSlug: string,
  userId: string | null,
): Promise<GetLearnCourseResult | null> {
  const courseRows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      isFree: course.isFree,
    })
    .from(course)
    .where(
      and(eq(course.slug, courseSlug), eq(course.status, "published"), isNull(course.deletedAt)),
    )
    .limit(1);

  const courseRow = courseRows[0];
  if (!courseRow) return null;

  const modules = await db
    .select({
      id: courseModule.id,
      title: courseModule.title,
      sortOrder: courseModule.sortOrder,
    })
    .from(courseModule)
    .where(and(eq(courseModule.courseId, courseRow.id), isNull(courseModule.deletedAt)))
    .orderBy(asc(courseModule.sortOrder));

  const lessons = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
    })
    .from(lesson)
    .where(isNull(lesson.deletedAt))
    .orderBy(asc(lesson.sortOrder));

  const byModule = new Map<string, LearnLesson[]>();
  for (const l of lessons) {
    const list = byModule.get(l.moduleId) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      isFree: l.isFree,
      sortOrder: l.sortOrder,
    });
    byModule.set(l.moduleId, list);
  }

  const curriculum: LearnModule[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    sortOrder: m.sortOrder,
    lessons: byModule.get(m.id) ?? [],
  }));

  let isEnrolled = false;
  let progress: LearnProgress[] = [];
  let resumeLessonId: string | null = null;

  if (userId) {
    const enrollRows = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.userId, userId),
          eq(enrollment.courseId, courseRow.id),
          eq(enrollment.status, "active"),
        ),
      )
      .limit(1);
    isEnrolled = enrollRows.length > 0;

    if (isEnrolled) {
      const progRows = await db
        .select({
          lessonId: lessonProgress.lessonId,
          status: lessonProgress.status,
          watchedSeconds: lessonProgress.watchedSeconds,
        })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId));
      progress = progRows;

      // Resume: last watched lesson, or first lesson if none.
      const lastWatched = progRows
        .filter((p) => p.status !== "not_started")
        .sort((a, b) => b.watchedSeconds - a.watchedSeconds)[0];
      if (lastWatched) {
        resumeLessonId = lastWatched.lessonId;
      }
    }
  }

  // For non-enrolled users, resume points to first free/preview lesson.
  if (!resumeLessonId) {
    outer: for (const mod of curriculum) {
      for (const les of mod.lessons) {
        if (les.isPreview || les.isFree || courseRow.isFree) {
          resumeLessonId = les.id;
          break outer;
        }
      }
    }
  }

  // Fallback to very first lesson.
  const firstModule = curriculum[0];
  if (!resumeLessonId && firstModule && firstModule.lessons.length > 0) {
    resumeLessonId = firstModule.lessons[0]!.id;
  }

  return {
    course: courseRow,
    modules: curriculum,
    isEnrolled,
    progress,
    resumeLessonId,
  };
}

export interface GetLearnLessonResult {
  id: string;
  title: string;
  bodyMd: string | null;
  bunnyVideoId: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleTitle: string;
  nextLessonId: string | null;
}

export async function getLearnLesson(
  courseSlug: string,
  lessonId: string,
): Promise<GetLearnLessonResult | null> {
  const rows = await db
    .select({
      id: lesson.id,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      videoMediaId: lesson.videoMediaId,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      moduleTitle: courseModule.title,
      moduleId: courseModule.id,
      lessonSortOrder: lesson.sortOrder,
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      and(
        eq(lesson.id, lessonId),
        eq(course.slug, courseSlug),
        eq(course.status, "published"),
        isNull(lesson.deletedAt),
        isNull(course.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Find next lesson in the same course.
  const nextRows = await db
    .select({ id: lesson.id })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      and(
        eq(courseModule.courseId, row.courseId),
        isNull(lesson.deletedAt),
      ),
    )
    .orderBy(asc(courseModule.sortOrder), asc(lesson.sortOrder))
    .limit(2);

  // Find the lesson that comes after the current one.
  let nextLessonId: string | null = null;
  let found = false;
  for (const nr of nextRows) {
    if (found) {
      nextLessonId = nr.id;
      break;
    }
    if (nr.id === lessonId) found = true;
  }

  return {
    id: row.id,
    title: row.title,
    bodyMd: row.bodyMd,
    bunnyVideoId: null, // Sprint 8: wire media_asset.bunny_video_id
    durationSeconds: row.durationSeconds,
    isPreview: row.isPreview,
    isFree: row.isFree,
    courseId: row.courseId,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    moduleTitle: row.moduleTitle,
    nextLessonId,
  };
}

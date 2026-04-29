import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";

export interface AdminCourseListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  isFree: boolean;
  price: string;
  publishedAt: Date | null;
  createdAt: Date;
}

export async function listAdminCourses(): Promise<AdminCourseListItem[]> {
  return db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
      isFree: course.isFree,
      price: course.price,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
    })
    .from(course)
    .where(isNull(course.deletedAt))
    .orderBy(desc(course.createdAt));
}

export async function getAdminCourseById(courseId: string) {
  const rows = await db
    .select()
    .from(course)
    .where(and(eq(course.id, courseId), isNull(course.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminCourse(input: {
  slug: string;
  title: string;
  summary: string;
  price: string;
  isFree: boolean;
  ownerUserId: string;
}) {
  // Invariant: a free course cannot have a non-zero price. Force price to 0
  // when isFree=true so admins can't accidentally save a contradictory state.
  const price = input.isFree ? "0.00" : input.price;
  const [row] = await db
    .insert(course)
    .values({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      price,
      isFree: input.isFree,
      ownerUserId: input.ownerUserId,
      createdByUserId: input.ownerUserId,
      status: "draft",
    })
    .returning({ id: course.id });
  return row!.id;
}

export async function updateAdminCourse(
  courseId: string,
  input: {
    title?: string;
    summary?: string;
    price?: string;
    isFree?: boolean;
    status?: string;
    publishedAt?: Date;
    coverMediaId?: string | null;
  },
) {
  const updates: typeof input = { ...input };

  // Same invariant on update: if the caller is flipping isFree=true, zero out
  // price (whether or not they passed a price field). If isFree is not part of
  // this update, trust the caller — db state already enforces the previous
  // invariant via the create path.
  if (updates.isFree === true) {
    updates.price = "0.00";
  }

  await db
    .update(course)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(course.id, courseId));
}

// ─── Admin Curriculum ───

export interface AdminCurriculumLesson {
  id: string;
  title: string;
  bodyMd: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
  videoMediaId: string | null;
  bunnyVideoId: string | null;
  quizId: string | null;
}

export interface AdminCurriculumModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: AdminCurriculumLesson[];
}

export async function getAdminCourseCurriculum(
  courseId: string,
): Promise<AdminCurriculumModule[]> {
  const modules = await db
    .select({
      id: courseModule.id,
      title: courseModule.title,
      sortOrder: courseModule.sortOrder,
    })
    .from(courseModule)
    .where(and(eq(courseModule.courseId, courseId), isNull(courseModule.deletedAt)))
    .orderBy(asc(courseModule.sortOrder));

  if (modules.length === 0) return [];

  const lessonsRows = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
      videoMediaId: lesson.videoMediaId,
      bunnyVideoId:
        sql<string | null>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
          "bunny_video_id",
        ),
      quizId: quiz.id,
    })
    .from(lesson)
    .leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .leftJoin(quiz, and(eq(quiz.lessonId, lesson.id), isNull(quiz.deletedAt)))
    .where(isNull(lesson.deletedAt))
    .orderBy(asc(lesson.sortOrder));

  const byModule = new Map<string, AdminCurriculumLesson[]>();
  for (const l of lessonsRows) {
    const list = byModule.get(l.moduleId) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      bodyMd: l.bodyMd,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      isFree: l.isFree,
      sortOrder: l.sortOrder,
      videoMediaId: l.videoMediaId,
      bunnyVideoId: l.bunnyVideoId,
      quizId: l.quizId ?? null,
    });
    byModule.set(l.moduleId, list);
  }

  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    sortOrder: m.sortOrder,
    lessons: byModule.get(m.id) ?? [],
  }));
}

export async function getAdminLessonById(lessonId: string) {
  const rows = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
      videoMediaId: lesson.videoMediaId,
      bunnyVideoId:
        sql<string | null>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
          "bunny_video_id",
        ),
      quizId: quiz.id,
    })
    .from(lesson)
    .leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .leftJoin(quiz, and(eq(quiz.lessonId, lesson.id), isNull(quiz.deletedAt)))
    .where(and(eq(lesson.id, lessonId), isNull(lesson.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminModule(input: {
  courseId: string;
  title: string;
  sortOrder: number;
  createdByUserId: string;
}) {
  const [row] = await db
    .insert(courseModule)
    .values({
      courseId: input.courseId,
      title: input.title,
      sortOrder: input.sortOrder,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: courseModule.id });
  return row!.id;
}

export async function createAdminLesson(input: {
  moduleId: string;
  title: string;
  sortOrder: number;
  createdByUserId: string;
}) {
  const [row] = await db
    .insert(lesson)
    .values({
      moduleId: input.moduleId,
      title: input.title,
      bodyMd: "",
      sortOrder: input.sortOrder,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: lesson.id });
  return row!.id;
}

export async function updateAdminLesson(
  lessonId: string,
  input: {
    title?: string;
    bodyMd?: string | null;
    isPreview?: boolean;
    isFree?: boolean;
    durationSeconds?: number | null;
    videoMediaId?: string | null;
  },
) {
  await db
    .update(lesson)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(lesson.id, lessonId));
}


// Reorder helpers run as a single TX. The actual sortOrder rewrite happens in
// two statements: first push every row's sortOrder into a non-clashing range
// (negative numbers), then write the final positions in a CASE expression.
// This keeps the unique (parent, sortOrder) constraint satisfied at every
// statement boundary even when the new order overlaps the old one.
//
// We also assert that the count of rows updated equals the input length, so
// callers passing bogus ids or ids belonging to another parent get a hard
// failure instead of a silent partial-write.

async function rewriteSortOrder(opts: {
  table: typeof courseModule | typeof lesson;
  parentColumn: typeof courseModule.courseId | typeof lesson.moduleId;
  parentId: string;
  ids: string[];
}) {
  const { table, parentColumn, parentId, ids } = opts;
  if (ids.length === 0) return;
  await db.transaction(async (tx) => {
    const moveAside = await tx
      .update(table)
      .set({
        sortOrder: sql`-${table.sortOrder} - 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(parentColumn, parentId), inArray(table.id, ids)))
      .returning({ id: table.id });

    if (moveAside.length !== ids.length) {
      throw new Error(
        `reorder: expected ${ids.length} rows for parent, got ${moveAside.length} — refusing partial write`,
      );
    }

    const cases = sql.join(
      ids.map((id, i) => sql`when ${table.id} = ${id} then ${i}`),
      sql.raw(" "),
    );
    await tx
      .update(table)
      .set({
        sortOrder: sql`case ${cases} else ${table.sortOrder} end`,
        updatedAt: new Date(),
      })
      .where(and(eq(parentColumn, parentId), inArray(table.id, ids)));
  });
}

export async function reorderAdminModules(
  courseId: string,
  moduleIds: string[],
) {
  await rewriteSortOrder({
    table: courseModule,
    parentColumn: courseModule.courseId,
    parentId: courseId,
    ids: moduleIds,
  });
}

export async function reorderAdminLessons(
  moduleId: string,
  lessonIds: string[],
) {
  await rewriteSortOrder({
    table: lesson,
    parentColumn: lesson.moduleId,
    parentId: moduleId,
    ids: lessonIds,
  });
}

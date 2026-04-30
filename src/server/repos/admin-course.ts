import "server-only";
import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
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
  /** Count of active enrollments — surfaced to admins on the courses list. */
  enrollmentCount: number;
}

export interface ListAdminCoursesOptions {
  /** Free-text search across title + slug. Case-insensitive. */
  q?: string;
  /** Filter by status. Pass "all" or omit to include every status. */
  status?: "draft" | "published" | "archived" | "all";
}

export async function listAdminCourses(
  options: ListAdminCoursesOptions = {},
): Promise<AdminCourseListItem[]> {
  const conditions = [isNull(course.deletedAt)];

  if (options.status && options.status !== "all") {
    conditions.push(eq(course.status, options.status));
  }

  const trimmed = options.q?.trim();
  if (trimmed) {
    const like = `%${trimmed}%`;
    const text = sql`(${course.title} ILIKE ${like} OR ${course.slug} ILIKE ${like})`;
    conditions.push(text);
  }

  // Subquery: active enrollments per course. Kept inline to avoid a global
  // import shape that would force dependents to know about the join.
  const enrollCount = db
    .select({
      courseId: enrollment.courseId,
      count: sql<number>`count(*)::int`.as("admin_enrollment_count"),
    })
    .from(enrollment)
    .where(eq(enrollment.status, "active"))
    .groupBy(enrollment.courseId)
    .as("admin_enrollment_count");

  const rows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
      isFree: course.isFree,
      price: course.price,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
      enrollmentCount: enrollCount.count,
    })
    .from(course)
    .leftJoin(enrollCount, eq(enrollCount.courseId, course.id))
    .where(and(...conditions))
    .orderBy(desc(course.createdAt));

  return rows.map((r) => ({ ...r, enrollmentCount: r.enrollmentCount ?? 0 }));
}

/**
 * Courses an admin can grant to a specific student. Filters out:
 * - drafts and archived courses (admins should only gift production catalog)
 * - courses the student is already enrolled in (any non-cancelled enrollment)
 */
export async function listGrantableCoursesForUser(
  studentUserId: string,
): Promise<{ id: string; title: string }[]> {
  const enrolledRows = await db
    .select({ courseId: enrollment.courseId })
    .from(enrollment)
    .where(eq(enrollment.userId, studentUserId));
  const enrolledIds = enrolledRows.map((r) => r.courseId);

  const where = enrolledIds.length
    ? and(
        eq(course.status, "published"),
        isNull(course.deletedAt),
        notInArray(course.id, enrolledIds),
      )
    : and(eq(course.status, "published"), isNull(course.deletedAt));

  return db
    .select({ id: course.id, title: course.title })
    .from(course)
    .where(where)
    .orderBy(asc(course.title));
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
  // Bidirectional invariant: free courses always have price 0, AND price 0
  // always means free. The latter prevents the legacy bug where admins
  // entered ฿0 with isFree=false, sending students into the slip-upload flow
  // for a free course.
  const priceNumber = Number(input.price);
  const isFree = input.isFree || priceNumber === 0;
  const price = isFree ? "0.00" : input.price;
  const [row] = await db
    .insert(course)
    .values({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      price,
      isFree,
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

  // Bidirectional invariant on update:
  // 1. isFree=true → force price=0
  // 2. price=0 → force isFree=true (so admins setting price to 0 don't trap
  //    students in the slip-upload flow for a "free" course).
  if (updates.isFree === true) {
    updates.price = "0.00";
  } else if (updates.price !== undefined && Number(updates.price) === 0) {
    updates.isFree = true;
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

export async function updateAdminModule(
  moduleId: string,
  input: { title?: string },
) {
  await db
    .update(courseModule)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(courseModule.id, moduleId));
}

/**
 * Soft-deletes a module and every lesson under it. We rely on cascading
 * soft-deletes (deletedAt) rather than hard-deletes so progress/enrollment
 * audit history stays intact. Quizzes attached to those lessons are also
 * tombstoned.
 */
export async function deleteAdminModule(moduleId: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    // Tombstone the module itself
    await tx
      .update(courseModule)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(courseModule.id, moduleId));

    // Tombstone its lessons
    const lessonRows = await tx
      .select({ id: lesson.id })
      .from(lesson)
      .where(and(eq(lesson.moduleId, moduleId), isNull(lesson.deletedAt)));
    const lessonIds = lessonRows.map((r) => r.id);
    if (lessonIds.length > 0) {
      await tx
        .update(lesson)
        .set({ deletedAt: now, updatedAt: now })
        .where(inArray(lesson.id, lessonIds));
      // Tombstone quizzes whose lesson is gone
      await tx
        .update(quiz)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(quiz.lessonId, lessonIds), isNull(quiz.deletedAt)));
    }
  });
}

export async function deleteAdminLesson(lessonId: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(lesson)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(lesson.id, lessonId));
    await tx
      .update(quiz)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(quiz.lessonId, lessonId), isNull(quiz.deletedAt)));
  });
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

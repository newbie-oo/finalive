import "server-only";
import { and, count, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { certificate } from "@/db/schema/certificate";
import { mediaAsset } from "@/db/schema/media";
import { quiz } from "@/db/schema/quiz";
import { coverImageUrl } from "@/lib/media-url";

export interface StudentDashboardData {
  enrollments: StudentEnrollmentItem[];
  totalWatchedSeconds: number;
  weeklyWatchedSeconds: number;
  certCount: number;
  completedCourses: number;
  streak: number;
  heatmap: number[];
  recentActivity: RecentActivityItem[];
  achievements: AchievementItem[];
}

export interface StudentEnrollmentItem {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  coverStorageKey: string | null;
  /** Pre-computed public CDN URL. Safe to pass to Client Components. */
  coverImageUrl: string | null;
  totalLessons: number;
  doneLessons: number;
  completedAt: Date | null;
}

export interface RecentActivityItem {
  type:
    | "lesson_complete"
    | "quiz_pass"
    | "quiz_fail"
    | "course_complete"
    | "enroll";
  title: string;
  meta?: string;
  at: Date;
}

export interface AchievementItem {
  icon: "trophy" | "flame" | "books" | "check-circle" | "certificate";
  title: string;
  desc: string;
  color: string;
}

export async function getStudentDashboardData(
  userId: string,
): Promise<StudentDashboardData> {
  // ── Enrollments with progress ──
  const lessonCountByCourse = db
    .select({
      courseId: courseModule.courseId,
      total: sql<number>`count(*)::int`.as("total_lessons"),
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      sql`${lesson.deletedAt} IS NULL AND ${courseModule.deletedAt} IS NULL`,
    )
    .groupBy(courseModule.courseId)
    .as("lesson_count_by_course");

  const doneByCourse = db
    .select({
      courseId: courseModule.courseId,
      done: sql<number>`count(*)::int`.as("done_lessons"),
    })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, "completed"),
      ),
    )
    .groupBy(courseModule.courseId)
    .as("done_by_course");

  const enrollments = await db
    .select({
      enrollmentId: enrollment.id,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      coverStorageKey: mediaAsset.storageKey,
      totalLessons: lessonCountByCourse.total,
      doneLessons: doneByCourse.done,
      completedAt: enrollment.completedAt,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
    .leftJoin(lessonCountByCourse, eq(lessonCountByCourse.courseId, course.id))
    .leftJoin(doneByCourse, eq(doneByCourse.courseId, course.id))
    .where(eq(enrollment.userId, userId))
    .orderBy(desc(enrollment.createdAt))
    .limit(50);

  // ── Watched seconds ──
  const watchedRows = await db
    .select({
      total: sql<number>`coalesce(sum(${lessonProgress.watchedSeconds}), 0)::int`,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));

  // ── Weekly watched seconds (this week Mon 00:00 UTC) ──
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun,1=Mon
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setUTCHours(0, 0, 0, 0);

  const weeklyRows = await db
    .select({
      total: sql<number>`coalesce(sum(${lessonProgress.watchedSeconds}), 0)::int`,
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        sql`${lessonProgress.lastWatchedAt} >= ${monday.toISOString()}`,
      ),
    );

  // ── Certificates ──
  const certRows = await db
    .select({ count: count() })
    .from(certificate)
    .innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
    .where(eq(enrollment.userId, userId));

  // ── Streak: consecutive days with any lesson progress ──
  const streakRows = await db
    .select({
      date: sql<string>`distinct date(${lessonProgress.lastWatchedAt})`.as(
        "date",
      ),
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId))
    .orderBy(desc(sql`date`));

  let streak = 0;
  if (streakRows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = streakRows.map((r) => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    const mostRecent = dates[0]!;
    const oneDay = 86400000;
    // Allow today or yesterday as the start of the streak
    if (mostRecent >= today.getTime() - oneDay) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        if (dates[i] === mostRecent - i * oneDay) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // ── Heatmap: activity intensity per day for last 35 days ──
  // Intensity = number of lessons with progress (capped at 4)
  const heatmapDays = 35;
  const heatStart = new Date(now);
  heatStart.setDate(now.getDate() - heatmapDays + 1);
  heatStart.setHours(0, 0, 0, 0);

  const heatRows = await db
    .select({
      date: sql<string>`date(${lessonProgress.lastWatchedAt})`.as("date"),
      lessons: sql<number>`count(distinct ${lessonProgress.lessonId})::int`.as(
        "lessons",
      ),
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        sql`${lessonProgress.lastWatchedAt} >= ${heatStart.toISOString()}`,
      ),
    )
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  const heatMapByDate = new Map<string, number>();
  for (const r of heatRows) {
    heatMapByDate.set(r.date, r.lessons);
  }

  const heatmap: number[] = [];
  for (let i = 0; i < heatmapDays; i++) {
    const d = new Date(heatStart);
    d.setDate(heatStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const lessons = heatMapByDate.get(key) ?? 0;
    // 0 = none, 1 = 1 lesson, 2 = 2-3, 3 = 4-5, 4 = 6+
    if (lessons === 0) heatmap.push(0);
    else if (lessons === 1) heatmap.push(1);
    else if (lessons <= 3) heatmap.push(2);
    else if (lessons <= 5) heatmap.push(3);
    else heatmap.push(4);
  }

  // ── Recent activity ──
  const recentLessons = await db
    .select({
      lessonTitle: lesson.title,
      courseTitle: course.title,
      at: lessonProgress.updatedAt,
    })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, "completed"),
      ),
    )
    .orderBy(desc(lessonProgress.updatedAt))
    .limit(10);

  const recentQuizzes = await db
    .select({
      quizTitle: quiz.title,
      courseTitle: course.title,
      passed: quizAttempt.passed,
      scorePct: quizAttempt.scorePct,
      at: quizAttempt.submittedAt,
    })
    .from(quizAttempt)
    .innerJoin(quiz, eq(quizAttempt.quizId, quiz.id))
    .innerJoin(lesson, eq(quiz.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(eq(quizAttempt.userId, userId))
    .orderBy(desc(quizAttempt.submittedAt))
    .limit(10);

  const recentCompleted = await db
    .select({
      courseTitle: course.title,
      at: enrollment.completedAt,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .where(
      and(
        eq(enrollment.userId, userId),
        sql`${enrollment.completedAt} IS NOT NULL`,
      ),
    )
    .orderBy(desc(enrollment.completedAt))
    .limit(10);

  const activity: RecentActivityItem[] = [
    ...recentLessons.map(
      (l): RecentActivityItem => ({
        type: "lesson_complete",
        title: l.lessonTitle,
        meta: l.courseTitle,
        at: l.at,
      }),
    ),
    ...recentQuizzes.map(
      (q): RecentActivityItem => ({
        type: q.passed ? "quiz_pass" : "quiz_fail",
        title: q.quizTitle,
        meta: `${q.scorePct}% · ${q.courseTitle}`,
        at: q.at,
      }),
    ),
    ...recentCompleted.map(
      (c): RecentActivityItem => ({
        type: "course_complete",
        title: c.courseTitle,
        at: c.at!,
      }),
    ),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  // ── Achievements ──
  const totalDoneLessons = enrollments.reduce(
    (sum, e) => sum + (e.doneLessons ?? 0),
    0,
  );
  const quizPassCount = recentQuizzes.filter((q) => q.passed).length;

  const achievements: AchievementItem[] = [
    {
      icon: "certificate",
      title: "ใบประกาศนักบุกเบิก",
      desc: `${certRows[0]?.count ?? 0} ใบประกาศแล้ว`,
      color: "var(--primary)",
    },
    {
      icon: "flame",
      title: `สตรีก ${streak} วัน`,
      desc: streak > 1 ? "เรียนต่อเนื่องทุกวัน" : "เริ่มต้นสตรีกของคุณ",
      color: "var(--accent)",
    },
    {
      icon: "books",
      title: "นักเรียนขยัน",
      desc: `จบ ${totalDoneLessons} บทเรียน`,
      color: "#10B981",
    },
  ];

  if (quizPassCount > 0) {
    achievements.push({
      icon: "check-circle",
      title: "Quiz Master",
      desc: `ผ่านแบบทดสอบ ${quizPassCount} ครั้ง`,
      color: "#8B5CF6",
    });
  }

  return {
    enrollments: enrollments.map((r) => ({
      enrollmentId: r.enrollmentId,
      courseId: r.courseId,
      courseSlug: r.courseSlug,
      courseTitle: r.courseTitle,
      coverStorageKey: r.coverStorageKey ?? null,
      coverImageUrl: coverImageUrl(r.coverStorageKey),
      totalLessons: r.totalLessons ?? 0,
      doneLessons: r.doneLessons ?? 0,
      completedAt: r.completedAt,
    })),
    totalWatchedSeconds: watchedRows[0]?.total ?? 0,
    weeklyWatchedSeconds: weeklyRows[0]?.total ?? 0,
    certCount: certRows[0]?.count ?? 0,
    completedCourses: enrollments.filter((e) => e.completedAt).length,
    streak,
    heatmap,
    recentActivity: activity,
    achievements,
  };
}

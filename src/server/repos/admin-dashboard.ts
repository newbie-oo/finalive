import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { certificate } from "@/db/schema/certificate";
import { user as userTable } from "@/db/schema/auth";

export interface AdminDashboardCounts {
  slipsSubmitted: number;
  slipsAcceptedToday: number;
  slipsRejectedToday: number;
  enrollmentsActive: number;
  coursesPublished: number;
  revenueMtd: number;
  certsMtd: number;
}

export interface MonthlyRevenue {
  month: string; // "ม.ค."
  year: number;
  current: number;
  previous: number;
}

export interface ActivityRow {
  time: string;
  userName: string;
  userColor: string;
  action: string;
  amount: string | null;
  status: "success" | "warning" | "primary";
  statusLabel: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MONTH_LABELS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function startOfMonthAt(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    submitted,
    acceptedToday,
    rejectedToday,
    activeEnroll,
    pubCourses,
    revenue,
    certs,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(eq(paymentSlip.status, "submitted")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(
        and(
          eq(paymentSlip.status, "accepted"),
          gte(paymentSlip.reviewedAt, today),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(paymentSlip)
      .where(
        and(
          eq(paymentSlip.status, "rejected"),
          gte(paymentSlip.reviewedAt, today),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(enrollment)
      .where(eq(enrollment.status, "active")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(course)
      .where(and(eq(course.status, "published"), isNull(course.deletedAt))),
    db
      .select({
        total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
      })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.source, "paid"),
          gte(enrollment.createdAt, monthStart),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(certificate)
      .where(gte(certificate.issuedAt, monthStart)),
  ]);

  return {
    slipsSubmitted: submitted[0]?.n ?? 0,
    slipsAcceptedToday: acceptedToday[0]?.n ?? 0,
    slipsRejectedToday: rejectedToday[0]?.n ?? 0,
    enrollmentsActive: activeEnroll[0]?.n ?? 0,
    coursesPublished: pubCourses[0]?.n ?? 0,
    revenueMtd: revenue[0]?.total ?? 0,
    certsMtd: certs[0]?.n ?? 0,
  };
}

export async function getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const now = new Date();
  const results: MonthlyRevenue[] = [];

  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = startOfMonthAt(year, month);
    const end = startOfMonthAt(year, month + 1);

    const [cur, prev] = await Promise.all([
      db
        .select({
          total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
        })
        .from(enrollment)
        .where(
          and(
            eq(enrollment.source, "paid"),
            gte(enrollment.createdAt, start),
            sql`${enrollment.createdAt} < ${end}`,
          ),
        ),
      db
        .select({
          total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
        })
        .from(enrollment)
        .where(
          and(
            eq(enrollment.source, "paid"),
            gte(enrollment.createdAt, new Date(year - 1, month, 1)),
            sql`${enrollment.createdAt} < ${new Date(year - 1, month + 1, 1)}`,
          ),
        ),
    ]);

    results.push({
      month: MONTH_LABELS[month]!,
      year,
      current: cur[0]?.total ?? 0,
      previous: prev[0]?.total ?? 0,
    });
  }

  return results;
}

const ACTIVITY_COLORS = [
  "#4F46E5",
  "#10B981",
  "#F97316",
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
];

export async function getRecentActivity(limit = 6): Promise<ActivityRow[]> {
  // Build a unified activity stream from enrollments + slips + certificates.
  // We run 3 queries and merge in memory because each table has different shapes.
  const [enrollRows, slipRows, certRows] = await Promise.all([
    db
      .select({
        time: enrollment.createdAt,
        userName: userTable.name,
        action: sql<string>`'สมัครคอร์ส ' || ${course.title}`,
        amount: enrollment.priceAtPurchase,
      })
      .from(enrollment)
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .innerJoin(userTable, eq(userTable.id, enrollment.userId))
      .orderBy(desc(enrollment.createdAt))
      .limit(limit),
    db
      .select({
        time: paymentSlip.createdAt,
        userName: userTable.name,
        action: sql<string>`'อัปโหลดสลิปการชำระเงิน'`,
        amount: paymentSlip.expectedAmount,
      })
      .from(paymentSlip)
      .innerJoin(
        pendingEnrollment,
        eq(pendingEnrollment.id, paymentSlip.pendingEnrollmentId),
      )
      .innerJoin(userTable, eq(userTable.id, pendingEnrollment.userId))
      .where(eq(paymentSlip.status, "submitted"))
      .orderBy(desc(paymentSlip.createdAt))
      .limit(limit),
    db
      .select({
        time: certificate.issuedAt,
        userName: userTable.name,
        action: sql<string>`'รับใบประกาศ ' || ${course.title}`,
        amount: sql<string>`'—'`,
      })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .innerJoin(course, eq(course.id, enrollment.courseId))
      .innerJoin(userTable, eq(userTable.id, enrollment.userId))
      .orderBy(desc(certificate.issuedAt))
      .limit(limit),
  ]);

  const all = [
    ...enrollRows.map((r) => ({
      time: r.time,
      userName: r.userName ?? "ผู้ใช้",
      action: r.action,
      amount:
        Number(r.amount) > 0
          ? `฿${Number(r.amount).toLocaleString("th-TH")}`
          : null,
      status: "success" as const,
      statusLabel: "สำเร็จ",
    })),
    ...slipRows.map((r) => ({
      time: r.time,
      userName: r.userName ?? "ผู้ใช้",
      action: r.action,
      amount: `฿${Number(r.amount).toLocaleString("th-TH")}`,
      status: "warning" as const,
      statusLabel: "รอตรวจ",
    })),
    ...certRows.map((r) => ({
      time: r.time,
      userName: r.userName ?? "ผู้ใช้",
      action: r.action,
      amount: null,
      status: "primary" as const,
      statusLabel: "รับใบประกาศ",
    })),
  ];

  all.sort((a, b) => b.time.getTime() - a.time.getTime());

  return all.slice(0, limit).map((r, i) => ({
    ...r,
    userColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]!,
    time: formatActivityTime(r.time),
  }));
}

function formatActivityTime(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`;
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

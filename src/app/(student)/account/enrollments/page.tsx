import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/server/auth-session";
import { listAccountPendings, listAccountEnrollments } from "@/server/repos/account";
import { formatTHB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { EnrollmentCard } from "@/components/account/enrollment-card";
import {
  PENDING_STATUS_LABEL,
  isActionable,
  type PendingStatus,
} from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "success" | "warning" | "review" | "destructive" | "neutral"> = {
  paid: "success",
  awaiting_payment: "warning",
  slip_submitted: "review",
  rejected: "destructive",
  expired: "neutral",
  cancelled: "neutral",
};

export default async function EnrollmentsPage() {
  const { user } = await requireSession();
  const [pendings, enrollments] = await Promise.all([
    listAccountPendings(user.id),
    listAccountEnrollments(user.id),
  ]);

  const enrolledCourseSlugs = new Set(enrollments.map((e) => e.courseSlug));
  const actionablePendings = pendings.filter(
    (p) => !enrolledCourseSlugs.has(p.courseSlug) && isActionable(p.status),
  );

  // Active = student hasn't finished. Completed = enrollment.completedAt set.
  // Splitting them visually keeps the "in-progress" deck front and centre,
  // while finished courses become a smaller browseable archive below.
  const inProgress = enrollments.filter((e) => !e.completedAt);
  const completed = enrollments.filter((e) => e.completedAt);

  const hasContent = enrollments.length > 0 || actionablePendings.length > 0;

  return (
    <section>
      <header className="mb-8">
        <h1 className="text-h1">คอร์สของฉัน</h1>
        <p className="mt-2 text-bodylg text-(--foreground-muted)">
          รายการคอร์สที่กำลังลงทะเบียน รอตรวจสลิป และที่เรียนได้แล้ว
        </p>
      </header>

      {!hasContent ? (
        <EmptyState
          icon={<GraduationCap size={28} weight="duotone" />}
          title="ยังไม่มีคอร์ส"
          description="เลือกคอร์สแรกแล้วเริ่มเรียนได้เลย"
          action={
            <Button asChild variant="accent">
              <Link href="/courses">เลือกคอร์ส</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {inProgress.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-h3">กำลังเรียน</h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((e) => (
                  <li key={e.enrollmentId}>
                    <EnrollmentCard
                      courseSlug={e.courseSlug}
                      courseTitle={e.courseTitle}
                      coverUrl={e.coverUrl}
                      totalLessons={e.totalLessons}
                      doneLessons={e.doneLessons}
                      completedAt={e.completedAt}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {actionablePendings.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-h3">รอดำเนินการ</h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {actionablePendings.map((p) => {
                  const tone = statusTone[p.status] ?? "neutral";
                  return (
                    <li key={p.pendingId}>
                      <Card className="flex h-full flex-col gap-3 overflow-hidden p-0">
                        <Link
                          href={`/checkout/${p.pendingId}`}
                          className="relative block aspect-video w-full overflow-hidden bg-(--surface-muted)"
                          aria-label={p.courseTitle}
                        >
                          {p.coverUrl ? (
                            <Image
                              src={p.coverUrl}
                              alt=""
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-[#312E81] to-[#1E1B4B] text-white">
                              <span className="text-h2">
                                {p.courseTitle.trim().charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="absolute left-3 top-3">
                            <StatusChip tone={tone}>
                              {PENDING_STATUS_LABEL[p.status as PendingStatus] ?? p.status}
                            </StatusChip>
                          </span>
                        </Link>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <h3 className="line-clamp-2 text-h4">{p.courseTitle}</h3>
                          <p className="text-uism text-(--foreground-muted)">
                            <span className="num">{formatTHB(p.amount)}</span> ·{" "}
                            <span className="mono text-caption">{p.refCode}</span>
                          </p>
                          <div className="mt-auto pt-2">
                            <Button asChild variant="secondary" size="md">
                              <Link href={`/checkout/${p.pendingId}`}>
                                ดูรายละเอียด
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-h3">เรียนจบแล้ว</h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((e) => (
                  <li key={e.enrollmentId}>
                    <EnrollmentCard
                      courseSlug={e.courseSlug}
                      courseTitle={e.courseTitle}
                      coverUrl={e.coverUrl}
                      totalLessons={e.totalLessons}
                      doneLessons={e.doneLessons}
                      completedAt={e.completedAt}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </section>
  );
}

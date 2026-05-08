import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle,
  PlayCircle,
  Certificate as CertIcon,
} from "@phosphor-icons/react/dist/ssr";
import { type Icon as IconCmp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";

type EnrollmentState = "completed" | "in_progress" | "ready";

export interface EnrollmentCardProps {
  courseSlug: string;
  courseTitle: string;
  coverUrl: string | null;
  totalLessons: number;
  doneLessons: number;
  /** Server-side completedAt (driven by enrollment table). When set, the card
   * shows the completed-state regardless of progress totals. */
  completedAt: Date | null;
}

function deriveState(props: EnrollmentCardProps): EnrollmentState {
  if (props.completedAt) return "completed";
  if (props.doneLessons > 0) return "in_progress";
  return "ready";
}

const STATE_LABEL: Record<
  EnrollmentState,
  { label: string; tone: "success" | "info" | "neutral"; icon: IconCmp }
> = {
  completed: { label: "เรียนจบแล้ว", tone: "success", icon: CheckCircle },
  in_progress: { label: "กำลังเรียน", tone: "info", icon: PlayCircle },
  ready: { label: "พร้อมเรียน", tone: "neutral", icon: PlayCircle },
};

export function EnrollmentCard(props: EnrollmentCardProps) {
  const state = deriveState(props);
  const meta = STATE_LABEL[state];
  const Ic = meta.icon;
  const pct =
    props.totalLessons > 0
      ? Math.min(
        100,
        Math.round((props.doneLessons / props.totalLessons) * 100),
      )
      : props.completedAt
        ? 100
        : 0;

  const ctaLabel =
    state === "completed"
      ? "ทบทวน"
      : state === "in_progress"
        ? "เรียนต่อ"
        : "เริ่มเรียน";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)">
      <Link
        href={`/learn/${props.courseSlug}`}
        className="relative block aspect-video w-full overflow-hidden bg-muted"
        aria-label={props.courseTitle}
      >
        {props.coverUrl ? (
          <Image
            src={props.coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <CoverFallback title={props.courseTitle} />
        )}
        {/* Top-left status chip; tone-mapped to status-chip primitive */}
        <span className="absolute left-3 top-3">
          <StatusChip tone={meta.tone}>
            <Ic size={12} weight="fill" /> {meta.label}
          </StatusChip>
        </span>
        {/* Progress bar overlay along the bottom of the cover so the student
            can see their progress without scrolling. Hidden in 'ready'
            (0 progress) state to avoid empty visual noise. */}
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30">
            <div
              className="h-full bg-primary"
              style={{ width: `${pct}%` }}
              aria-label={`Progress ${pct}%`}
            />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-h4 text-foreground">
          {props.courseTitle}
        </h3>
        <div className="text-uism text-muted-foreground">
          <span className="num">{props.doneLessons}</span> /{" "}
          <span className="num">{props.totalLessons}</span> บทเรียน
          {pct > 0 && (
            <>
              {" · "}
              <span className="num font-medium text-foreground">
                {pct}%
              </span>
            </>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild variant="primary" size="md">
            <Link href={`/learn/${props.courseSlug}`}>
              <Ic size={16} weight="fill" /> {ctaLabel}
            </Link>
          </Button>
          {state === "completed" && (
            <Button asChild variant="ghost" size="md">
              <Link href="/account/certificates">
                <CertIcon size={16} weight="duotone" /> ดูใบประกาศ
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function CoverFallback({ title }: { title: string }) {
  const initial = (title.trim().charAt(0) || "F").toUpperCase();
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-linear-to-br from-hero-from to-hero-to">
      <div
        aria-hidden
        className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-accent/20 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#818CF8]/30 blur-2xl"
      />
      <span
        className="relative font-semibold text-white"
        style={{ fontSize: 48, letterSpacing: "-0.02em" }}
      >
        {initial}
      </span>
    </div>
  );
}

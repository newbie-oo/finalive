import { StatusChip } from "@/components/ui/status-chip";

/**
 * A lesson has two independent access flags:
 * - is_preview → playable by anyone, including logged-out visitors
 * - is_free    → playable by any logged-in member without enrolling
 *
 * The QA pass found these flags surfaced inconsistently ("ตัวอย่าง"
 * vs "ฟรี" vs lock icon, sometimes both at once). Centralize the label
 * mapping here so every lesson list draws the same conclusion.
 */
export type LessonBadgeVariant = "preview" | "free" | "locked" | null;

export function pickLessonBadge(input: {
  isPreview: boolean;
  isFree: boolean;
}): LessonBadgeVariant {
  if (input.isPreview) return "preview";
  if (input.isFree) return "free";
  return null;
}

export function LessonAccessBadge({
  isPreview,
  isFree,
  size = "md",
}: {
  isPreview: boolean;
  isFree: boolean;
  size?: "sm" | "md";
}) {
  const variant = pickLessonBadge({ isPreview, isFree });
  if (!variant) return null;

  // Size-tuned variant for compact spots like the learn-page sidebar.
  if (size === "sm") {
    if (variant === "preview") {
      return (
        <span className="rounded-full bg-info-bg px-1.5 text-[10px] font-medium text-info-foreground">
          ดูฟรี
        </span>
      );
    }
    return (
      <span className="rounded-full bg-success-bg px-1.5 text-[10px] font-medium text-success-foreground">
        ฟรี
      </span>
    );
  }

  if (variant === "preview") {
    return <StatusChip tone="info">ดูฟรี</StatusChip>;
  }
  return <StatusChip tone="success">ฟรีสำหรับสมาชิก</StatusChip>;
}

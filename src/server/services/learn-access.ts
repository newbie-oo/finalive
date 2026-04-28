import "server-only";

export type AccessResult =
  | { ok: true }
  | { ok: false; reason: "login_required" | "purchase_required" };

interface LessonAccess {
  isPreview: boolean;
  isFree: boolean;
}

interface CourseAccess {
  isFree: boolean;
}

export function checkLessonAccess(
  lesson: LessonAccess,
  course: CourseAccess,
  isEnrolled: boolean,
  isAuthenticated: boolean,
): AccessResult {
  // Preview or free lessons are always accessible.
  if (lesson.isPreview || lesson.isFree) return { ok: true };
  // Entirely free courses are always accessible.
  if (course.isFree) return { ok: true };
  // Authenticated + enrolled users get everything.
  if (isEnrolled) return { ok: true };
  // Not authenticated → login first.
  if (!isAuthenticated) return { ok: false, reason: "login_required" };
  // Authenticated but not enrolled → buy.
  return { ok: false, reason: "purchase_required" };
}

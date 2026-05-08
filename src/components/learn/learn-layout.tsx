"use client";

import { useMemo } from "react";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { MobileCurriculumDrawer } from "./mobile-curriculum-drawer";
import { CourseCompleteModal } from "./course-complete-modal";
import { useLearnShell } from "./learn-shell-context";
import type { SidebarModule } from "./curriculum-sidebar";

interface LearnLayoutProps {
  courseSlug: string;
  modules: SidebarModule[];
  progress: Array<{ lessonId: string; status: string }>;
  passedQuizIds?: Record<string, boolean>;
  isEnrolled: boolean;
  isAdmin?: boolean;
  totalLessons: number;
  doneLessons: number;
  children: React.ReactNode;
}

export function LearnLayout({
  courseSlug,
  modules,
  progress,
  passedQuizIds,
  isEnrolled,
  isAdmin = false,
  totalLessons,
  doneLessons,
  children,
}: LearnLayoutProps) {
  const { sidebarOpen, mobileDrawerOpen, toggleMobileDrawer } = useLearnShell();

  const passedQuizMap = useMemo(
    () =>
      passedQuizIds
        ? new Map(Object.entries(passedQuizIds))
        : new Map<string, boolean>(),
    [passedQuizIds],
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>

        {sidebarOpen && (
          <aside className="hidden lg:block w-[320px] shrink-0 border-l border-border overflow-hidden">
            <CurriculumSidebar
              courseSlug={courseSlug}
              modules={modules}
              progress={progress}
              passedQuizIds={passedQuizMap}
              isEnrolled={isEnrolled}
              isAdmin={isAdmin}
              totalLessons={totalLessons}
            />
          </aside>
        )}
      </div>

      <MobileCurriculumDrawer
        open={mobileDrawerOpen}
        onClose={() => toggleMobileDrawer()}
        courseSlug={courseSlug}
        modules={modules}
        progress={progress}
        passedQuizIds={passedQuizMap}
        isEnrolled={isEnrolled}
        isAdmin={isAdmin}
      />

      {!isAdmin && (
        <CourseCompleteModal
          courseSlug={courseSlug}
          totalLessons={totalLessons}
          doneLessons={doneLessons}
        />
      )}
    </div>
  );
}

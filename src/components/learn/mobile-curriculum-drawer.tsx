"use client";

import { CurriculumSidebar } from "./curriculum-sidebar";

interface MobileCurriculumDrawerProps {
  open: boolean;
  onClose: () => void;
  courseSlug: string;
  modules: Parameters<typeof CurriculumSidebar>[0]["modules"];
  progress: Parameters<typeof CurriculumSidebar>[0]["progress"];
  passedQuizIds?: Parameters<typeof CurriculumSidebar>[0]["passedQuizIds"];
  isEnrolled: boolean;
  isAdmin?: boolean;
}

export function MobileCurriculumDrawer({
  open,
  onClose,
  isAdmin,
  ...sidebarProps
}: MobileCurriculumDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
      style={{
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[78%] flex-col rounded-t-2xl bg-(--surface) shadow-lg"
        style={{ boxShadow: "0 -12px 40px rgba(0,0,0,0.2)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="h-1 w-8 rounded-full bg-(--border-strong)" />
        </div>
        <div className="flex-1 overflow-hidden">
          <CurriculumSidebar
            {...sidebarProps}
            isAdmin={isAdmin}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

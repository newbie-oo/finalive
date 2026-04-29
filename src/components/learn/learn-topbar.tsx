"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CaretLeft,
  Sun,
  Moon,
  List,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface LearnTopbarProps {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  totalLessons: number;
  doneLessons: number;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function LearnTopbar({
  courseTitle,
  moduleTitle,
  lessonTitle,
  totalLessons,
  doneLessons,
  onToggleSidebar,
  sidebarOpen,
}: LearnTopbarProps) {
  const { theme, setTheme } = useTheme();
  const progressPct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-(--border) bg-(--background) px-4 lg:px-6">
      <Link
        href={`/courses/${useParams().courseSlug as string}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
        aria-label="กลับ"
      >
        <CaretLeft size={18} />
      </Link>

      <div className="min-w-0 flex-1 lg:flex-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-ui font-semibold text-(--foreground)">
            {lessonTitle}
          </span>
        </div>
        <div className="hidden text-caption text-(--foreground-muted) lg:block">
          {courseTitle} · {moduleTitle}
        </div>
      </div>

      {/* Desktop progress center */}
      <div className="hidden max-w-[480px] flex-1 items-center gap-4 lg:flex">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-muted)">
          <div
            className="h-full rounded-full bg-(--primary) transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="num shrink-0 text-caption font-semibold text-(--primary)">
          {progressPct}% ·{" "}
          <span className="font-medium text-(--foreground-muted)">
            {doneLessons}/{totalLessons} บท
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted) lg:inline-flex"
          aria-label="สลับธีม"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors",
            sidebarOpen
              ? "bg-(--surface-muted) text-(--primary)"
              : "text-(--foreground) hover:bg-(--surface-muted)"
          )}
          aria-label={sidebarOpen ? "ปิดหลักสูตร" : "เปิดหลักสูตร"}
        >
          {sidebarOpen ? <X size={18} /> : <List size={18} />}
        </button>
      </div>
    </header>
  );
}

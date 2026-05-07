"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { CaretLeft, Sun, Moon, List, X, Bell } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSession } from "@/lib/auth-client";
import { AvatarInitials } from "@/components/ui/avatar-initials";

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
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [routeChanging, setRouteChanging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const progressPct =
    totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setRouteChanging(true);
      const t = setTimeout(() => setRouteChanging(false), 400);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-(--border) bg-(--background) px-4 lg:px-6">
      {routeChanging && (
        <div className="absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-(--primary)" />
        </div>
      )}
      <Link
        href={`/courses/${useParams().courseSlug as string}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
        aria-label="กลับ"
      >
        <CaretLeft size={18} />
      </Link>

      <div className="hidden items-center gap-1.5 text-ui font-bold text-(--foreground) lg:flex">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-(--primary)" />
        Finalive
      </div>
      <div className="hidden h-6 w-px bg-(--border) lg:block" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-ui font-semibold text-(--foreground)">
            {courseTitle}
          </span>
        </div>
        <div className="hidden text-caption text-(--foreground-muted) lg:block">
          {moduleTitle} · {lessonTitle}
        </div>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <span className="text-caption text-(--foreground-muted)">
          ความคืบหน้า
        </span>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-(--surface-muted)">
          <div
            className="h-full rounded-full bg-(--primary) transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="num text-caption font-semibold text-(--primary)">
          {progressPct}%
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted)"
          aria-label="การแจ้งเตือน"
        >
          <Bell size={18} />
        </button>
        {session?.user ? (
          <AvatarInitials
            name={session.user.name || session.user.email || "User"}
            src={session.user.image}
            size="sm"
          />
        ) : null}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-(--foreground) transition-colors hover:bg-(--surface-muted) lg:inline-flex"
          aria-label="สลับธีม"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun size={16} />
            ) : (
              <Moon size={16} />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors",
            sidebarOpen
              ? "bg-(--surface-muted) text-(--primary)"
              : "text-(--foreground) hover:bg-(--surface-muted)",
          )}
          aria-label={sidebarOpen ? "ปิดหลักสูตร" : "เปิดหลักสูตร"}
        >
          {sidebarOpen ? <X size={18} /> : <List size={18} />}
        </button>
      </div>
    </header>
  );
}

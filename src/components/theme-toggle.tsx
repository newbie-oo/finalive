"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ORDER = ["light", "dark"] as const;
type ThemeKey = (typeof ORDER)[number];

const ICONS: Record<ThemeKey, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
};

const LABELS: Record<ThemeKey, string> = {
  light: "Light",
  dark: "Dark",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: defer hydration
  useEffect(() => setMounted(true), []);

  const current: ThemeKey =
    mounted && (ORDER as readonly string[]).includes(theme ?? "")
      ? (theme as ThemeKey)
      : "light";
  const Icon = ICONS[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "light";

  function cycle() {
    if (next) setTheme(next);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 cursor-pointer"
          aria-label={`Theme: ${LABELS[current]} (click to change)`}
          onClick={cycle}
          data-testid="theme-toggle"
        >
          <Icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        เปลี่ยนเป็น {LABELS[next]} mode
      </TooltipContent>
    </Tooltip>
  );
}

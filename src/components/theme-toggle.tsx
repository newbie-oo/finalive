"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeKey = (typeof ORDER)[number];

const ICONS: Record<ThemeKey, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeKey, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: defer hydration
  useEffect(() => setMounted(true), []);

  const current: ThemeKey = mounted && (ORDER as readonly string[]).includes(theme ?? "")
    ? (theme as ThemeKey)
    : "system";
  const Icon = ICONS[current];

  function cycle() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    if (next) setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11"
      aria-label={`Theme: ${LABELS[current]} (click to change)`}
      onClick={cycle}
      data-testid="theme-toggle"
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}

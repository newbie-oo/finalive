"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react";

export const THEME_ORDER = ["light", "dark"] as const;
export type ThemeKey = (typeof THEME_ORDER)[number];

const ICONS: Record<ThemeKey, React.ComponentType<{ className?: string }>> = {
	light: Sun,
	dark: Moon,
};

const LABELS: Record<ThemeKey, string> = {
	light: "Light",
	dark: "Dark",
};

const noopSubscribe = () => () => {};

export interface UseThemeToggle {
	/** Resolved current theme. Returns "light" before hydration to keep SSR
	 * + first client render in sync. */
	current: ThemeKey;
	/** The theme that `cycle()` will switch to next. */
	next: ThemeKey;
	/** Icon component for the current theme. */
	Icon: React.ComponentType<{ className?: string }>;
	/** Human label for the current theme (e.g. "Light"). */
	label: string;
	/** Human label for the next theme. */
	nextLabel: string;
	/** Whether hydration has finished. Use to gate UI that depends on the
	 * client-only theme value. */
	mounted: boolean;
	/** Advance to the next theme in `THEME_ORDER`. */
	cycle: () => void;
	/** Set theme directly. */
	setTheme: (theme: ThemeKey) => void;
}

/**
 * Bridges `next-themes` to UI components. Handles the SSR/hydration mismatch
 * via `useSyncExternalStore` so callers don't need their own `mounted` guard.
 */
export function useThemeToggle(): UseThemeToggle {
	const { theme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	);

	const current: ThemeKey =
		mounted && (THEME_ORDER as readonly string[]).includes(theme ?? "")
			? (theme as ThemeKey)
			: "light";
	const next =
		THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length] ??
		"light";

	return {
		current,
		next,
		Icon: ICONS[current],
		label: LABELS[current],
		nextLabel: LABELS[next],
		mounted,
		cycle: () => setTheme(next),
		setTheme: (t) => setTheme(t),
	};
}

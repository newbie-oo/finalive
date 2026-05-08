"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media-query subscription. Returns `null` on the server and
 * during the first client render so callers can render a deterministic
 * fallback; the real value swaps in after mount.
 */
export function useMediaQuery(query: string): boolean | null {
	const [matches, setMatches] = useState<boolean | null>(null);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mql = window.matchMedia(query);
		setMatches(mql.matches);
		const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, [query]);

	return matches;
}

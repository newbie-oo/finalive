"use client";

import { useEffect } from "react";

/**
 * Warns the user via the browser's native beforeunload prompt when they
 * try to close the tab / refresh / navigate-via-url with unsaved edits.
 *
 * Note: this only catches *browser-level* navigation (page reload, tab
 * close, URL bar). It does NOT catch in-app `<Link>` clicks because
 * Next.js handles those via client-side router. For full coverage on
 * Link clicks, wrap navigation triggers in your own confirm() — but for
 * the common 90% case (accidental refresh) this is enough.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the message and show a generic prompt,
      // but setting returnValue is still required for the prompt to fire.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

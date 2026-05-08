"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "finalive.cookieConsent";
const STORAGE_TIMESTAMP_KEY = "finalive.cookieConsent.acceptedAt";

type Choice = "accepted" | "essential";

function readChoice(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Sentinel returned during SSR/initial hydration so the banner stays hidden
// until we can read localStorage on the client. Returning users never see a
// banner flash.
const SSR_SENTINEL = "__ssr__";

/**
 * PDPA-friendly first-visit consent banner. We don't load any non-essential
 * tracking yet — this banner records the user's choice so we (a) stop
 * showing it on subsequent visits and (b) gate any future analytics behind
 * `localStorage.getItem(STORAGE_KEY) === 'accepted'`.
 */
export function CookieBanner() {
  const persistedChoice = useSyncExternalStore(
    subscribeStorage,
    readChoice,
    () => SSR_SENTINEL,
  );
  const [dismissed, setDismissed] = useState(false);

  const persist = useCallback((choice: Choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
    } catch {
      // Best-effort only.
    }
    setDismissed(true);
  }, []);

  if (persistedChoice !== null || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-lg"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-uism text-muted-foreground">
          <p
            id="cookie-banner-title"
            className="font-medium text-foreground"
          >
            เราใช้คุกกี้เพื่อให้บริการพื้นฐาน
          </p>
          <p className="mt-1">
            เว็บไซต์ใช้คุกกี้สำหรับการเข้าสู่ระบบและการชำระเงินซึ่งจำเป็นต้องเปิดเสมอ
            หากกด “ยอมรับทั้งหมด”
            เราจะใช้คุกกี้เพิ่มเติมในอนาคตเพื่อปรับปรุงประสบการณ์
            อ่านรายละเอียดที่{" "}
            <Link
              href="/legal/privacy"
              className="text-primary hover:underline"
            >
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => persist("essential")}
            className="inline-flex h-10 items-center rounded-button border border-border bg-muted px-4 text-uism font-medium text-foreground hover:bg-surface-sunken"
          >
            จำเป็นเท่านั้น
          </button>
          <button
            type="button"
            onClick={() => persist("accepted")}
            className="inline-flex h-10 items-center rounded-button bg-accent px-4 text-uism font-medium text-accent-foreground hover:bg-accent-hover"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}

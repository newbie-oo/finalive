"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "finalive.cookieConsent";
const STORAGE_TIMESTAMP_KEY = "finalive.cookieConsent.acceptedAt";

type Choice = "accepted" | "essential";

/**
 * PDPA-friendly first-visit consent banner. We don't load any non-essential
 * tracking yet — this banner records the user's choice so we (a) stop
 * showing it on subsequent visits and (b) gate any future analytics behind
 * `localStorage.getItem(STORAGE_KEY) === 'accepted'`.
 */
export function CookieBanner() {
  // Initialize from localStorage in a layout effect so the first render
  // already has the correct value (avoids the flash + the
  // react-hooks/set-state-in-effect lint warning that's triggered by
  // setState-during-effect on mount).
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible !== null) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — fall through to "don't show" behavior.
    }
    // localStorage is an external system; reading it on mount is the
    // canonical setState-in-effect pattern for client-side persistence.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(stored === null);
  }, [visible]);

  function persist(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
    } catch {
      // Best-effort only.
    }
    setVisible(false);
  }

  if (visible !== true) return null;

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

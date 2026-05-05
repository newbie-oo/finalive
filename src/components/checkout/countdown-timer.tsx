"use client";

import { useEffect, useState } from "react";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmt(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [left, setLeft] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setLeft(expiresAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = left <= 0;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={expired ? "เวลาชำระเงินหมดอายุ" : `เหลือเวลา ${fmt(left)}`}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-mono ${expired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {!expired && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {expired ? "หมดเวลา" : fmt(left)}
    </div>
  );
}

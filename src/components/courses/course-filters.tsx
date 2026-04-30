"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface CourseFiltersProps {
  initialQ: string;
  initialFreeOnly: boolean;
}

export function CourseFilters({ initialQ, initialFreeOnly }: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [freeOnly, setFreeOnly] = useState(initialFreeOnly);
  const debouncedQ = useDebouncedValue(q, 300);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the initial mount so we don't bounce a router.replace on render.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedQ.trim()) next.set("q", debouncedQ.trim());
    else next.delete("q");
    if (freeOnly) next.set("free", "1");
    else next.delete("free");
    // Reset pagination when filters change.
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
    // searchParams omitted on purpose: we read once and write back; reading here
    // would cause an infinite loop on the URL we just set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, freeOnly, router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="q">
        ค้นหาคอร์ส
      </label>
      <input
        id="q"
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)"
        className="h-10 w-full rounded-button border border-(--border) bg-(--surface) px-3 text-ui sm:w-72"
      />
      <label className="inline-flex items-center gap-2 text-ui">
        <input
          type="checkbox"
          checked={freeOnly}
          onChange={(e) => setFreeOnly(e.target.checked)}
          className="h-4 w-4 accent-(--primary)"
        />
        เฉพาะคอร์สฟรี
      </label>
      {q.trim() || freeOnly ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setFreeOnly(false);
          }}
          className="text-uism text-(--foreground-muted) underline-offset-2 hover:underline"
        >
          ล้างตัวกรอง
        </button>
      ) : null}
    </div>
  );
}

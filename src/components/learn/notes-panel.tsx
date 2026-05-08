"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotePencil, CaretDown, CaretUp, Trash } from "@phosphor-icons/react";

interface NotesPanelProps {
  lessonId: string;
}

function getStorageKey(userId: string, lessonId: string) {
  return `finalive-notes-${userId}-${lessonId}`;
}

function readNoteFromStorage(userId: string, lessonId: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(getStorageKey(userId, lessonId)) ?? "";
}

export function NotesPanel({ lessonId }: NotesPanelProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "anonymous";
  const [note, setNote] = useState(() => readNoteFromStorage(userId, lessonId));
  const [saved, setSaved] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKeyRef = useRef<string>(getStorageKey(userId, lessonId));

  // Update note when lessonId changes
  useEffect(() => {
    const key = getStorageKey(userId, lessonId);
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;
    const existing = readNoteFromStorage(userId, lessonId);
    setNote(existing);
    setSaved(false);
  }, [userId, lessonId]);

  const saveToStorage = useCallback(
    (value: string) => {
      const key = getStorageKey(userId, lessonId);
      localStorage.setItem(key, value);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    },
    [userId, lessonId],
  );

  const handleChange = (value: string) => {
    setNote(value);
    setSaved(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveToStorage(value);
    }, 1000);
  };

  const handleClear = () => {
    setNote("");
    setSaved(false);
    const key = getStorageKey(userId, lessonId);
    localStorage.removeItem(key);
  };

  return (
    <div className="space-y-3" data-testid="notes-panel">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-3 text-ui font-medium lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="notes-textarea"
      >
        <span className="flex items-center gap-2">
          <NotePencil size={18} weight="duotone" />
          โน้ตของฉัน
        </span>
        {mobileOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
      </button>

      <div
        id="notes-textarea"
        className={`space-y-3 ${mobileOpen ? "block" : "hidden lg:block"}`}
      >
        <div className="relative">
          <textarea
            value={note}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="จดโน้ตของคุณที่นี่..."
            className="min-h-[200px] w-full resize-y rounded-xl border border-border bg-card p-4 text-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            aria-label="โน้ตบทเรียน"
          />
          {saved && (
            <span className="absolute bottom-3 right-3 text-caption text-success">
              บันทึกแล้ว
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            {note.length} ตัวอักษร
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={note.length === 0}
          >
            <Trash size={14} weight="bold" />
            ล้าง
          </Button>
        </div>
      </div>
    </div>
  );
}

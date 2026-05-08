"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SimpleTiptapEditor } from "@/components/ui/simple-tiptap-editor";
import {
  NotePencil,
  CaretDown,
  CaretUp,
  Trash,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";

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

/** Strip HTML tags to estimate the readable length of a Tiptap document. */
function plainTextLength(html: string): number {
  if (!html) return 0;
  if (typeof window === "undefined") return html.length;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent ?? "").length;
}

export function NotesPanel({ lessonId }: NotesPanelProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "anonymous";
  const [note, setNote] = useState(() => readNoteFromStorage(userId, lessonId));
  const [saved, setSaved] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKeyRef = useRef<string>(getStorageKey(userId, lessonId));

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

  const charCount = plainTextLength(note);

  return (
    <div className="space-y-3" data-testid="notes-panel">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-3 text-ui font-medium lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="notes-editor"
      >
        <span className="flex items-center gap-2">
          <NotePencil size={18} weight="duotone" />
          โน้ตของฉัน
        </span>
        {mobileOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
      </button>

      <div
        id="notes-editor"
        className={`space-y-2 ${mobileOpen ? "block" : "hidden lg:block"}`}
      >
        <div className="relative">
          <SimpleTiptapEditor
            value={note}
            onChange={handleChange}
            placeholder="จดโน้ตของคุณที่นี่..."
          />
          {saved && (
            <span className="pointer-events-none absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-pill bg-success-bg px-2 py-0.5 text-caption text-success">
              <CheckCircle size={12} weight="fill" />
              บันทึกแล้ว · เมื่อสักครู่
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            <span className="num">{charCount}</span> ตัวอักษร
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={charCount === 0}
          >
            <Trash size={14} weight="bold" />
            ล้าง
          </Button>
        </div>
      </div>
    </div>
  );
}

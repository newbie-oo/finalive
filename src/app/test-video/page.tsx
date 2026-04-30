"use client";

import { useState } from "react";
import { VidstackPlayer } from "@/components/course/vidstack-player";

export default function TestVideoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="flex h-[100dvh] flex-col bg-(--background)">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-(--border) px-4">
        <span className="text-ui font-semibold">Test Learn Page</span>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="ml-auto rounded bg-(--surface-muted) px-3 py-1 text-uism"
        >
          {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        </button>
      </header>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="bg-black flex justify-center lg:p-4">
            <div className="w-full">
              <VidstackPlayer
                src="https://www.w3schools.com/html/mov_bbb.mp4"
                title="Test Video"
              />
            </div>
          </div>
          <div className="px-4 py-8 max-w-[720px] mx-auto">
            <h1 className="text-h2">Test Lesson</h1>
            <p className="mt-4 text-body">Video should now fill full width.</p>
          </div>
        </main>
        {sidebarOpen && (
          <aside className="hidden lg:block w-[320px] shrink-0 border-l border-(--border) overflow-hidden bg-(--surface)">
            <div className="p-4">
              <p className="text-body font-medium">Sidebar</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

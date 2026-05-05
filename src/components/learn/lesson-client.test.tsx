import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonClient } from "./lesson-client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("LessonClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    global.fetch = fetchSpy as typeof global.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /api/learn/start once on mount", async () => {
    render(
      <LessonClient
        lessonId="l1"
        courseSlug="cs1"
        nextLessonId={null}
        durationSeconds={120}
        completed={false}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/learn/start",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ lessonId: "l1" }),
      }),
    );
  });

  it("renders nothing when not completed", async () => {
    render(
      <LessonClient
        lessonId="l1"
        courseSlug="cs1"
        nextLessonId="l2"
        quizId="q1"
        durationSeconds={120}
        completed={false}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText("เช็คความเข้าใจ")).not.toBeInTheDocument();
  });

  it("shows quiz CTA when completed and quiz exists", async () => {
    render(
      <LessonClient
        lessonId="l1"
        courseSlug="cs1"
        nextLessonId="l2"
        quizId="q1"
        durationSeconds={120}
        completed={true}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("เช็คความเข้าใจ")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ทำแบบทดสอบ/ }),
    ).toBeInTheDocument();
  });

  it("shows next lesson CTA when completed and no quiz", async () => {
    render(
      <LessonClient
        lessonId="l1"
        courseSlug="cs1"
        nextLessonId="l2"
        durationSeconds={120}
        completed={true}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("link", { name: /บทถัดไป/ })).toBeInTheDocument();
  });

  it("skips start call when isAdmin is true", async () => {
    render(
      <LessonClient
        lessonId="l1"
        courseSlug="cs1"
        nextLessonId={null}
        durationSeconds={120}
        isAdmin
        completed={false}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

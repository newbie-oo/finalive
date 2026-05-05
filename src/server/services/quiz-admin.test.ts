import { describe, it, expect, vi } from "vitest";
import { QuizAdminService } from "./quiz-admin";

vi.mock("server-only", () => ({}));

function fakeDeps() {
  return {
    getQuizById: vi.fn().mockResolvedValue({
      id: "q1",
      lessonId: "l1",
      courseId: "c1",
      title: "Quiz 1",
      passScorePct: 60,
    }),
    saveQuiz: vi.fn().mockResolvedValue(undefined),
    getLessonCourseId: vi.fn().mockResolvedValue("c1"),
    createQuiz: vi.fn().mockResolvedValue("q1"),
  };
}

describe("QuizAdminService", () => {
  it("saves quiz and returns fresh data", async () => {
    const deps = fakeDeps();
    const svc = new QuizAdminService(deps);
    const result = await svc.save({
      quizId: "q1",
      passScorePct: 70,
      questions: [
        {
          promptMd: "What is 2+2?",
          choices: [{ body: "4", isCorrect: true }],
        },
      ],
    });
    expect(result.id).toBe("q1");
    expect(deps.saveQuiz).toHaveBeenCalledWith("q1", {
      passScorePct: 70,
      questions: expect.any(Array),
    });
  });

  it("throws when quiz disappears after save", async () => {
    const deps = fakeDeps();
    deps.getQuizById.mockResolvedValue(null);
    const svc = new QuizAdminService(deps);
    await expect(
      svc.save({ quizId: "q1", passScorePct: 60, questions: [] }),
    ).rejects.toThrow("quiz_not_found_after_save");
  });

  it("creates quiz", async () => {
    const deps = fakeDeps();
    const svc = new QuizAdminService(deps);
    const id = await svc.create({
      lessonId: "l1",
      title: "New Quiz",
      passScorePct: 60,
      createdByUserId: "u1",
    });
    expect(id).toBe("q1");
  });

  it("resolves course id from lesson", async () => {
    const deps = fakeDeps();
    const svc = new QuizAdminService(deps);
    const courseId = await svc.resolveCourseId("l1");
    expect(courseId).toBe("c1");
  });

  it("returns null when lesson has no course", async () => {
    const deps = fakeDeps();
    deps.getLessonCourseId.mockResolvedValue(null);
    const svc = new QuizAdminService(deps);
    const courseId = await svc.resolveCourseId("l1");
    expect(courseId).toBeNull();
  });
});

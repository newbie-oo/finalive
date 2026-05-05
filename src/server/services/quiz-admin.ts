import "server-only";
import type { AdminQuiz } from "@/server/repos/admin-quiz";

export interface QuizQuestion {
  id?: string;
  promptMd: string;
  choices: Array<{
    id?: string;
    body: string;
    isCorrect: boolean;
  }>;
}

export interface QuizAdminDeps {
  getQuizById: (quizId: string) => Promise<AdminQuiz | null>;
  saveQuiz: (
    quizId: string,
    data: { passScorePct: number; questions: QuizQuestion[] },
  ) => Promise<void>;
  getLessonCourseId: (lessonId: string) => Promise<string | null>;
  createQuiz: (input: {
    lessonId: string;
    title: string;
    passScorePct: number;
    createdByUserId: string;
  }) => Promise<string>;
}

export class QuizAdminService {
  constructor(private deps: QuizAdminDeps) {}

  async save(params: {
    quizId: string;
    passScorePct: number;
    questions: QuizQuestion[];
  }): Promise<AdminQuiz> {
    await this.deps.saveQuiz(params.quizId, {
      passScorePct: params.passScorePct,
      questions: params.questions,
    });

    const fresh = await this.deps.getQuizById(params.quizId);
    if (!fresh) {
      throw new Error("quiz_not_found_after_save");
    }
    return fresh;
  }

  async resolveCourseId(lessonId: string): Promise<string | null> {
    return this.deps.getLessonCourseId(lessonId);
  }

  async create(params: {
    lessonId: string;
    title: string;
    passScorePct: number;
    createdByUserId: string;
  }): Promise<string> {
    return this.deps.createQuiz({
      lessonId: params.lessonId,
      title: params.title,
      passScorePct: params.passScorePct,
      createdByUserId: params.createdByUserId,
    });
  }
}

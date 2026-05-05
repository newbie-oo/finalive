import "server-only";
import type { CurriculumModule } from "@/server/repos/course";

function classifyDbError(
  err: unknown,
): "not_found" | "invalid_input" | "unexpected" {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("foreign key") || msg.includes("violates foreign")) {
      return "not_found";
    }
    if (msg.includes("unique constraint") || msg.includes("violates unique")) {
      return "invalid_input";
    }
  }
  return "unexpected";
}

export interface CurriculumAdminDeps {
  getCourseCurriculum: (courseId: string) => Promise<CurriculumModule[]>;
  createAdminModule: (input: {
    courseId: string;
    title: string;
    sortOrder: number;
    createdByUserId: string;
  }) => Promise<string>;
  createAdminLesson: (input: {
    moduleId: string;
    title: string;
    bodyMd?: string;
    sortOrder: number;
    createdByUserId: string;
  }) => Promise<string>;
  updateAdminModule: (
    moduleId: string,
    input: { title?: string },
  ) => Promise<void>;
  updateAdminLesson: (
    lessonId: string,
    input: {
      title?: string;
      bodyMd?: string | null;
      isPreview?: boolean;
      isFree?: boolean;
    },
  ) => Promise<void>;
  deleteAdminModule: (moduleId: string) => Promise<void>;
  deleteAdminLesson: (lessonId: string) => Promise<void>;
  reorderAdminModules: (courseId: string, moduleIds: string[]) => Promise<void>;
  reorderAdminLessons: (moduleId: string, lessonIds: string[]) => Promise<void>;
}

export interface VerifyResult {
  ok: true;
}

export interface VerifyError {
  ok: false;
  error: "not_found";
}

export interface CurriculumAdminService {
  computeNextModuleSortOrder(courseId: string): Promise<number>;
  computeNextLessonSortOrder(
    courseId: string,
    moduleId: string,
  ): Promise<number | null>;
  verifyModuleInCourse(
    moduleId: string,
    courseId: string,
  ): Promise<VerifyResult | VerifyError>;
  verifyLessonInCourse(
    lessonId: string,
    courseId: string,
  ): Promise<VerifyResult | VerifyError>;
  createModule(
    courseId: string,
    title: string,
    createdByUserId: string,
  ): Promise<
    { ok: true; moduleId: string } | { ok: false; error: "invalid_input" }
  >;
  createLesson(
    courseId: string,
    moduleId: string,
    title: string,
    createdByUserId: string,
    body?: string,
  ): Promise<
    | { ok: true; lessonId: string }
    | { ok: false; error: "not_found" | "invalid_input" }
  >;
  updateModule(
    courseId: string,
    moduleId: string,
    patch: { title: string },
  ): Promise<{ ok: true } | { ok: false; error: "not_found" }>;
  updateLesson(
    courseId: string,
    lessonId: string,
    patch: {
      title?: string;
      bodyMd?: string | null;
      isPreview?: boolean;
      isFree?: boolean;
    },
  ): Promise<{ ok: true } | { ok: false; error: "not_found" }>;
  deleteModule(
    courseId: string,
    moduleId: string,
  ): Promise<{ ok: true } | { ok: false; error: "not_found" }>;
  deleteLesson(
    courseId: string,
    lessonId: string,
  ): Promise<{ ok: true } | { ok: false; error: "not_found" }>;
  reorderModules(
    courseId: string,
    orderedIds: string[],
  ): Promise<
    { ok: true } | { ok: false; error: "not_found" | "invalid_input" }
  >;
  reorderLessons(
    moduleId: string,
    orderedIds: string[],
  ): Promise<
    { ok: true } | { ok: false; error: "not_found" | "invalid_input" }
  >;
}

export function createCurriculumAdminService(
  deps: CurriculumAdminDeps,
): CurriculumAdminService {
  async function computeNextModuleSortOrder(courseId: string): Promise<number> {
    const curriculum = await deps.getCourseCurriculum(courseId);
    if (curriculum.length === 0) return 0;
    return Math.max(...curriculum.map((m) => m.sortOrder)) + 1;
  }

  async function computeNextLessonSortOrder(
    courseId: string,
    moduleId: string,
  ): Promise<number | null> {
    const curriculum = await deps.getCourseCurriculum(courseId);
    const targetModule = curriculum.find((m) => m.id === moduleId);
    if (!targetModule) return null;
    if (targetModule.lessons.length === 0) return 0;
    return Math.max(...targetModule.lessons.map((l) => l.sortOrder)) + 1;
  }

  async function verifyModuleInCourse(
    moduleId: string,
    courseId: string,
  ): Promise<VerifyResult | VerifyError> {
    const curriculum = await deps.getCourseCurriculum(courseId);
    return curriculum.some((m) => m.id === moduleId)
      ? { ok: true }
      : { ok: false, error: "not_found" };
  }

  async function verifyLessonInCourse(
    lessonId: string,
    courseId: string,
  ): Promise<VerifyResult | VerifyError> {
    const curriculum = await deps.getCourseCurriculum(courseId);
    for (const mod of curriculum) {
      if (mod.lessons.some((l) => l.id === lessonId)) {
        return { ok: true };
      }
    }
    return { ok: false, error: "not_found" };
  }

  return {
    computeNextModuleSortOrder,
    computeNextLessonSortOrder,
    verifyModuleInCourse,
    verifyLessonInCourse,

    async createModule(courseId, title, createdByUserId) {
      const sortOrder = await computeNextModuleSortOrder(courseId);
      const moduleId = await deps.createAdminModule({
        courseId,
        title,
        sortOrder,
        createdByUserId,
      });
      return { ok: true, moduleId };
    },

    async createLesson(courseId, moduleId, title, createdByUserId, body) {
      const verified = await verifyModuleInCourse(moduleId, courseId);
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }
      const sortOrder = await computeNextLessonSortOrder(courseId, moduleId);
      if (sortOrder === null) {
        return { ok: false, error: "not_found" };
      }
      const lessonId = await deps.createAdminLesson({
        moduleId,
        title,
        bodyMd: body ?? "",
        sortOrder,
        createdByUserId,
      });
      return { ok: true, lessonId };
    },

    async updateModule(courseId, moduleId, patch) {
      const verified = await verifyModuleInCourse(moduleId, courseId);
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }
      await deps.updateAdminModule(moduleId, patch);
      return { ok: true };
    },

    async updateLesson(courseId, lessonId, patch) {
      const verified = await verifyLessonInCourse(lessonId, courseId);
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }
      await deps.updateAdminLesson(lessonId, patch);
      return { ok: true };
    },

    async deleteModule(courseId, moduleId) {
      const verified = await verifyModuleInCourse(moduleId, courseId);
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }
      await deps.deleteAdminModule(moduleId);
      return { ok: true };
    },

    async deleteLesson(courseId, lessonId) {
      const verified = await verifyLessonInCourse(lessonId, courseId);
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }
      await deps.deleteAdminLesson(lessonId);
      return { ok: true };
    },

    async reorderModules(courseId, orderedIds) {
      try {
        await deps.reorderAdminModules(courseId, orderedIds);
        return { ok: true };
      } catch (err) {
        const kind = classifyDbError(err);
        if (kind === "unexpected") throw err;
        return { ok: false, error: kind };
      }
    },

    async reorderLessons(moduleId, orderedIds) {
      try {
        await deps.reorderAdminLessons(moduleId, orderedIds);
        return { ok: true };
      } catch (err) {
        const kind = classifyDbError(err);
        if (kind === "unexpected") throw err;
        return { ok: false, error: kind };
      }
    },
  };
}

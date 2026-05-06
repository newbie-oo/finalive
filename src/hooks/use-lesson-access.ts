"use client";

import { useMemo } from "react";

interface AccessLesson {
	id: string;
	isPreview: boolean;
	isFree: boolean;
}

interface AccessModule {
	id: string;
	lessons: AccessLesson[];
}

export interface LessonAccessResult {
	/** Map lessonId → locked (true = user cannot access). */
	lessonLocked: ReadonlyMap<string, boolean>;
	/** Map moduleId → locked (true = entire module hidden). */
	moduleLocked: ReadonlyMap<string, boolean>;
}

/** Compute lesson/module access control from enrollment and role. */
export function useLessonAccess({
	modules,
	isEnrolled,
	isAdmin,
}: {
	modules: AccessModule[];
	isEnrolled: boolean;
	isAdmin: boolean;
}): LessonAccessResult {
	return useMemo(() => {
		const lessonLocked = new Map<string, boolean>();
		const moduleLocked = new Map<string, boolean>();

		modules.forEach((mod, modIdx) => {
			const modLocked =
				!isAdmin &&
				!isEnrolled &&
				modIdx > 0 &&
				!mod.lessons.some((l) => l.isPreview || l.isFree);
			moduleLocked.set(mod.id, modLocked);

			mod.lessons.forEach((les) => {
				const locked = !isAdmin && !isEnrolled && !les.isPreview && !les.isFree;
				lessonLocked.set(les.id, locked);
			});
		});

		return { lessonLocked, moduleLocked };
	}, [modules, isEnrolled, isAdmin]);
}

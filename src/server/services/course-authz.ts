import "server-only";

export type CourseRole = "owner" | "instructor" | "editor" | "viewer" | "none";

export interface CourseAccess {
	role: CourseRole;
	canEdit: boolean;
	canPublish: boolean;
}

export interface CanEditCoursePureInput {
	userId: string;
	userRole: string;
	courseOwnerId: string | null;
	collaboratorRole: string | null;
}

export function canEditCoursePure(input: CanEditCoursePureInput): boolean {
	if (input.userRole === "admin") return true;
	if (input.courseOwnerId === input.userId) return true;
	if (
		input.collaboratorRole === "instructor" ||
		input.collaboratorRole === "editor"
	)
		return true;
	return false;
}

export function getCourseAccessPure(input: {
	userId: string;
	userRole: string;
	courseOwnerId: string | null;
	collaboratorRole: string | null;
}): CourseAccess {
	if (input.userRole === "admin") {
		return { role: "owner", canEdit: true, canPublish: true };
	}
	if (input.courseOwnerId === input.userId) {
		return { role: "owner", canEdit: true, canPublish: true };
	}
	if (input.collaboratorRole === "instructor") {
		return { role: "instructor", canEdit: true, canPublish: true };
	}
	if (input.collaboratorRole === "editor") {
		return { role: "editor", canEdit: true, canPublish: false };
	}
	if (input.collaboratorRole === "viewer") {
		return { role: "viewer", canEdit: false, canPublish: false };
	}
	return { role: "none", canEdit: false, canPublish: false };
}

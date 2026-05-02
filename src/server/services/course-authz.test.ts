import { describe, it, expect } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
	db: {},
}));

const { canEditCoursePure } = await import("./course-authz");

describe("canEditCoursePure", () => {
	it("returns true for admin regardless of ownership", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "admin",
				courseOwnerId: "u2",
				collaboratorRole: null,
			}),
		).toBe(true);
	});

	it("returns true for course owner", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u1",
				collaboratorRole: null,
			}),
		).toBe(true);
	});

	it("returns true for instructor collaborator", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: "instructor",
			}),
		).toBe(true);
	});

	it("returns true for editor collaborator", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: "editor",
			}),
		).toBe(true);
	});

	it("returns false for viewer collaborator", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: "viewer",
			}),
		).toBe(false);
	});

	it("returns false for non-owner with no collaborator role", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: null,
			}),
		).toBe(false);
	});

	it("returns false when ownerId is null", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: null,
				collaboratorRole: null,
			}),
		).toBe(false);
	});
});

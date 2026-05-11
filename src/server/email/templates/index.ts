export type { VerifyEmailProps } from "./verify-email";
export type { PasswordResetProps } from "./password-reset";
export type { GrantCourseProps } from "./grant-course";
export type { SlipReceivedProps } from "./slip-received";
export type { SlipAcceptedProps } from "./slip-accepted";
export type { SlipRejectedProps } from "./slip-rejected";
export type { CourseCompletedProps } from "./course-completed";
export type { AdminNewSlipProps } from "./admin-new-slip";

export interface EmailPayload {
	template: string;
	params: Record<string, unknown>;
}

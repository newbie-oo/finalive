import type { VerifyEmailProps } from "./verify-email";
import type { PasswordResetProps } from "./password-reset";
import type { GrantCourseProps } from "./grant-course";
import type { SlipReceivedProps } from "./slip-received";
import type { SlipAcceptedProps } from "./slip-accepted";
import type { SlipRejectedProps } from "./slip-rejected";
import type { CourseCompletedProps } from "./course-completed";
import type { AdminNewSlipProps } from "./admin-new-slip";

export type {
	VerifyEmailProps,
	PasswordResetProps,
	GrantCourseProps,
	SlipReceivedProps,
	SlipAcceptedProps,
	SlipRejectedProps,
	CourseCompletedProps,
	AdminNewSlipProps,
};

/** Discriminated union of every email template with its strongly-typed params.
 *  This is the single source of truth for what templates exist and what data
 *  they require. Callers get compile-time checking; the queue layer serializes
 *  to JSON before storage. */
export type EmailPayload =
	| { template: "verify_email"; params: VerifyEmailProps }
	| { template: "password_reset"; params: PasswordResetProps }
	| { template: "course_granted"; params: GrantCourseProps }
	| { template: "slip_received"; params: SlipReceivedProps }
	| { template: "slip_accepted"; params: SlipAcceptedProps }
	| { template: "slip_rejected"; params: SlipRejectedProps }
	| { template: "course_completed"; params: CourseCompletedProps }
	| { template: "admin_new_slip"; params: AdminNewSlipProps };

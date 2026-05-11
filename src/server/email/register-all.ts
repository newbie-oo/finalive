import "server-only";
import { registerTemplate } from "./template-registry";
import { VerifyEmail, verifyEmailSubject } from "./templates/verify-email";
import { PasswordReset, passwordResetSubject } from "./templates/password-reset";
import { GrantCourse, grantCourseSubject } from "./templates/grant-course";
import { SlipReceived, slipReceivedSubject } from "./templates/slip-received";
import { SlipAccepted, slipAcceptedSubject } from "./templates/slip-accepted";
import { SlipRejected, slipRejectedSubject } from "./templates/slip-rejected";
import { CourseCompleted, courseCompletedSubject } from "./templates/course-completed";
import { AdminNewSlip, adminNewSlipSubject } from "./templates/admin-new-slip";
import type { ReactElement } from "react";

const asEntry = (
  c: unknown,
) => c as (params: Record<string, unknown>) => ReactElement;

registerTemplate({
  name: "verify_email",
  subject: verifyEmailSubject,
  component: asEntry(VerifyEmail),
});

registerTemplate({
  name: "password_reset",
  subject: passwordResetSubject,
  component: asEntry(PasswordReset),
});

registerTemplate({
  name: "course_granted",
  subject: grantCourseSubject,
  component: asEntry(GrantCourse),
});

registerTemplate({
  name: "slip_received",
  subject: slipReceivedSubject,
  component: asEntry(SlipReceived),
});

registerTemplate({
  name: "slip_accepted",
  subject: slipAcceptedSubject,
  component: asEntry(SlipAccepted),
});

registerTemplate({
  name: "slip_rejected",
  subject: slipRejectedSubject,
  component: asEntry(SlipRejected),
});

registerTemplate({
  name: "course_completed",
  subject: courseCompletedSubject,
  component: asEntry(CourseCompleted),
});

registerTemplate({
  name: "admin_new_slip",
  subject: adminNewSlipSubject,
  component: asEntry(AdminNewSlip),
});

import "server-only";
import { render } from "@react-email/components";
import { sendMail } from "@/server/services/mailer";
import {
  VerifyEmail,
  verifyEmailSubject,
} from "@/server/email/templates/verify-email";
import {
  PasswordReset,
  passwordResetSubject,
} from "@/server/email/templates/password-reset";
import {
  GrantCourse,
  grantCourseSubject,
} from "@/server/email/templates/grant-course";
import {
  SlipReceived,
  slipReceivedSubject,
} from "@/server/email/templates/slip-received";
import {
  SlipAccepted,
  slipAcceptedSubject,
} from "@/server/email/templates/slip-accepted";
import {
  SlipRejected,
  slipRejectedSubject,
} from "@/server/email/templates/slip-rejected";
import {
  CourseCompleted,
  courseCompletedSubject,
} from "@/server/email/templates/course-completed";
import {
  AdminNewSlip,
  adminNewSlipSubject,
} from "@/server/email/templates/admin-new-slip";
export async function dispatchEmail(
  template: string,
  toEmail: string,
  params: Record<string, unknown>,
): Promise<void> {
  let node: React.ReactElement;
  let subject: string;

  switch (template) {
    case "verify_email": {
      node = VerifyEmail(params as { name: string; url: string });
      subject = verifyEmailSubject;
      break;
    }
    case "password_reset": {
      node = PasswordReset(params as { name: string; url: string });
      subject = passwordResetSubject;
      break;
    }
    case "course_granted": {
      node = GrantCourse(params as { name: string; courseTitle: string; learnUrl: string });
      subject = grantCourseSubject;
      break;
    }
    case "slip_received": {
      node = SlipReceived(params as { name: string; courseTitle: string; refCode: string; amount: string });
      subject = slipReceivedSubject;
      break;
    }
    case "slip_accepted": {
      node = SlipAccepted(params as { name: string; courseTitle: string; courseSlug: string; refCode: string; amount: string; baseUrl: string });
      subject = slipAcceptedSubject;
      break;
    }
    case "slip_rejected": {
      node = SlipRejected(params as { name: string; courseTitle: string; refCode: string; amount: string; reasonLabel: string; note: string | null; baseUrl: string });
      subject = slipRejectedSubject;
      break;
    }
    case "course_completed": {
      node = CourseCompleted(params as { name: string; courseTitle: string; certCode: string; verifyUrl: string; pdfUrl: string });
      subject = courseCompletedSubject;
      break;
    }
    case "admin_new_slip": {
      node = AdminNewSlip(params as { studentEmail: string; courseTitle: string; refCode: string; amount: string; reviewUrl: string });
      subject = adminNewSlipSubject;
      break;
    }
    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);

  await sendMail({ to: toEmail, subject, html, text });
}

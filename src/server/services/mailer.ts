import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { render } from "@react-email/components";
import { getEnv } from "@/lib/env";
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

declare global {
  var __finalive_mail_transport: Transporter | undefined;
}

function getTransport(): Transporter {
  if (globalThis.__finalive_mail_transport)
    return globalThis.__finalive_mail_transport;
  const env = getEnv();
  const secure = env.SMTP_PORT === 465;
  globalThis.__finalive_mail_transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return globalThis.__finalive_mail_transport;
}

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(args: SendArgs): Promise<void> {
  const env = getEnv();
  await getTransport().sendMail({
    from: env.EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}

export interface VerificationEmailArgs {
  to: string;
  name: string;
  url: string;
}

export async function sendVerificationEmail(
  args: VerificationEmailArgs,
): Promise<void> {
  const node = VerifyEmail({ name: args.name, url: args.url });
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  await sendMail({ to: args.to, subject: verifyEmailSubject, html, text });
}

export interface PasswordResetEmailArgs {
  to: string;
  name: string;
  url: string;
}

export async function sendPasswordResetEmail(
  args: PasswordResetEmailArgs,
): Promise<void> {
  const node = PasswordReset({ name: args.name, url: args.url });
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  await sendMail({ to: args.to, subject: passwordResetSubject, html, text });
}

export interface GrantCourseEmailArgs {
  to: string;
  name: string;
  courseTitle: string;
  learnUrl: string;
}

export async function sendGrantCourseEmail(
  args: GrantCourseEmailArgs,
): Promise<void> {
  const node = GrantCourse({
    name: args.name,
    courseTitle: args.courseTitle,
    learnUrl: args.learnUrl,
  });
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  await sendMail({ to: args.to, subject: grantCourseSubject, html, text });
}

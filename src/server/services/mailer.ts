import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";

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

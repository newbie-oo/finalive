import "server-only";

// Stub — full Nodemailer + EmailShell implementation arrives in commit 1.11.
// Keeping the same exported signatures so wiring (auth.ts) stays stable.

export interface VerificationEmailArgs {
  to: string;
  name: string;
  url: string;
}

export interface PasswordResetEmailArgs {
  to: string;
  name: string;
  url: string;
}

export async function sendVerificationEmail(args: VerificationEmailArgs): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[mailer:stub] verify ->", args.to, args.url);
  }
}

export async function sendPasswordResetEmail(args: PasswordResetEmailArgs): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[mailer:stub] reset ->", args.to, args.url);
  }
}

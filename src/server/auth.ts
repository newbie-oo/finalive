import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { pendingEnrollment } from "@/db/schema/payment";
import { lessonProgress, quizAttempt } from "@/db/schema/progress";
import { getEnv } from "@/lib/env";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./services/mailer";

const env = getEnv();

/**
 * Cancel-or-purge per-user app data before Better-Auth removes the user row.
 * Schema does NOT cascade FKs from the auth user table to app tables (the
 * userId columns are plain text), so we tidy up explicitly:
 *   - active enrollments → 'cancelled' (keep history for audit/cert)
 *   - pending enrollments → 'cancelled'
 *   - lesson progress + quiz attempts → deleted (PII, no audit value)
 * Certificate rows survive: the cert artifact remains verifiable by code.
 */
async function purgeUserData(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(enrollment)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(enrollment.userId, userId));
    await tx
      .update(pendingEnrollment)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        sql`${pendingEnrollment.userId} = ${userId} AND ${pendingEnrollment.status} IN ('awaiting_payment','slip_submitted')`,
      );
    await tx.delete(quizAttempt).where(eq(quizAttempt.userId, userId));
    await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId));
  });
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, name: user.name, url });
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await purgeUserData(user.id);
      },
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [admin(), nextCookies()],
});

export type Auth = typeof auth;

import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { enrollment } from "./enrollment";
import { mediaAsset } from "./media";

export const certificate = pgTable(
  "certificate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id),
    certCode: text("cert_code").notNull().unique(),
    pdfMediaId: uuid("pdf_media_id")
      .notNull()
      .references(() => mediaAsset.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedByUserId: text("revoked_by_user_id"),
    revokeReason: text("revoke_reason"),
  },
  (t) => ({
    enrollmentUk: unique("cert_enrollment_uk").on(t.enrollmentId),
    certCodeIdx: index("cert_code_idx").on(t.certCode),
  }),
);

export type Certificate = typeof certificate.$inferSelect;
export type NewCertificate = typeof certificate.$inferInsert;

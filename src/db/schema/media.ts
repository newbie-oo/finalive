import { pgTable, uuid, text, bigint, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const mediaAsset = pgTable(
  "media_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(), // 'image' | 'video' | 'pdf'
    storage: text("storage").notNull(), // 'r2_public' | 'r2_private' | 'bunny_stream'
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    // Lifecycle:
    //   pending_upload — row created before remote PUT (orphan-cleaned by cron)
    //   encoding       — Bunny PUT done, awaiting VideoEncoded webhook
    //   ready          — playable
    //   failed         — Bunny reported a transcode failure
    status: text("status").notNull().default("ready"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: text("created_by_user_id").notNull(),
  },
  (t) => ({
    statusChk: check(
      "media_asset_status_chk",
      sql`${t.status} IN ('pending_upload','encoding','ready','failed')`,
    ),
    storageLookup: index("media_asset_storage_lookup").on(t.storage, t.storageKey),
    pendingIdx: index("media_asset_pending_idx")
      .on(t.createdAt)
      .where(sql`${t.status} = 'pending_upload'`),
  }),
);

export type MediaAsset = typeof mediaAsset.$inferSelect;

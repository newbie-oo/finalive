import { pgTable, uuid, text, bigint, integer, timestamp, index } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: text("created_by_user_id").notNull(),
  },
  (t) => ({
    storageLookup: index("media_asset_storage_lookup").on(t.storage, t.storageKey),
  }),
);

export type MediaAsset = typeof mediaAsset.$inferSelect;

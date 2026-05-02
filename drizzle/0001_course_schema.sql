CREATE TABLE IF NOT EXISTS "course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description_md" text,
	"cover_media_id" uuid,
	"owner_user_id" text NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	CONSTRAINT "course_slug_unique" UNIQUE("slug"),
	CONSTRAINT "course_status_chk" CHECK ("course"."status" IN ('draft','published','archived')),
	CONSTRAINT "course_price_chk" CHECK ("course"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_collaborator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by_user_id" text NOT NULL,
	CONSTRAINT "collab_unique" UNIQUE("course_id","user_id"),
	CONSTRAINT "collab_role_chk" CHECK ("course_collaborator"."role" IN ('instructor','editor','viewer'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body_md" text,
	"video_media_id" uuid,
	"duration_seconds" integer,
	"is_preview" boolean DEFAULT false NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	CONSTRAINT "lesson_sort_uk" UNIQUE("module_id","sort_order"),
	CONSTRAINT "lesson_content_chk" CHECK ("lesson"."body_md" IS NOT NULL OR "lesson"."video_media_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description_md" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"updated_by_user_id" text,
	CONSTRAINT "module_sort_uk" UNIQUE("course_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"storage" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course" ADD CONSTRAINT "course_cover_media_id_media_asset_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_collaborator" ADD CONSTRAINT "course_collaborator_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson" ADD CONSTRAINT "lesson_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson" ADD CONSTRAINT "lesson_video_media_id_media_asset_id_fk" FOREIGN KEY ("video_media_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module" ADD CONSTRAINT "module_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_status_published_idx" ON "course" USING btree ("status","published_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_owner_idx" ON "course" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_user_idx" ON "course_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_module_idx" ON "lesson" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_course_idx" ON "module" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_asset_storage_lookup" ON "media_asset" USING btree ("storage","storage_key");
CREATE TABLE "drafts" (
	"id" text PRIMARY KEY,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"tone" text NOT NULL,
	"length" text NOT NULL,
	"language" text NOT NULL,
	"hashtags" jsonb DEFAULT '[]' NOT NULL,
	"quality" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "drafts_session_updated_idx" ON "drafts" ("session_id","updated_at");
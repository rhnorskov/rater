CREATE TABLE IF NOT EXISTS "movie_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"original_title" text NOT NULL,
	"original_language" text NOT NULL,
	"release_date" date NOT NULL,
	"poster_path" text NOT NULL,
	"popularity" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rating_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"contender_a_id" uuid NOT NULL,
	"contender_b_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_table" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rating_table" ADD CONSTRAINT "rating_table_profile_id_profile_table_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rating_table" ADD CONSTRAINT "rating_table_contender_a_id_movie_table_id_fk" FOREIGN KEY ("contender_a_id") REFERENCES "public"."movie_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rating_table" ADD CONSTRAINT "rating_table_contender_b_id_movie_table_id_fk" FOREIGN KEY ("contender_b_id") REFERENCES "public"."movie_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rating_table" ADD CONSTRAINT "rating_table_winner_id_movie_table_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."movie_table"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_table" ADD CONSTRAINT "profile_table_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tmdb_id_idx" ON "movie_table" USING btree ("tmdb_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "title_idx" ON "movie_table" USING btree ("title");
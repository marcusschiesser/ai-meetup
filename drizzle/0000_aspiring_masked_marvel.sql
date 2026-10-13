CREATE TABLE "demos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_description_length" CHECK (length(trim("demos"."description")) between 1 and 300)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_name_length" CHECK (length(trim("topics"."first_name")) between 1 and 80),
	CONSTRAINT "topic_description_length" CHECK (length(trim("topics"."description")) between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"topic_id" uuid NOT NULL,
	"browser_id" uuid NOT NULL,
	CONSTRAINT "votes_topic_id_browser_id_pk" PRIMARY KEY("topic_id","browser_id")
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demos_date_idx" ON "demos" USING btree ("date");--> statement-breakpoint
CREATE INDEX "rate_limits_expiry_idx" ON "rate_limits" USING btree ("expires_at");
CREATE TYPE "public"."batch_status" AS ENUM('queued', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"status" "batch_status" DEFAULT 'queued' NOT NULL,
	"file_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_key" text NOT NULL,
	"source" text,
	"invoice_count" integer,
	"failed_count" integer,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"file_deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"invoice_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"type" text NOT NULL,
	"currency" char(3) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"issuer_name" text NOT NULL,
	"issuer_nit" text NOT NULL,
	"client_name" text NOT NULL,
	"client_nit" text NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_file" text NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_batch_id_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("batch_id") ON DELETE cascade ON UPDATE no action;
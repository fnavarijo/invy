-- Step 1: Create batch_invoices junction table
CREATE TABLE "batch_invoices" (
	"batch_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"source_file" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_invoices_batch_id_invoice_id_pk" PRIMARY KEY("batch_id","invoice_id")
);
--> statement-breakpoint
ALTER TABLE "batch_invoices" ADD CONSTRAINT "batch_invoices_batch_id_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("batch_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "batch_invoices" ADD CONSTRAINT "batch_invoices_invoice_id_invoices_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("invoice_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "batch_invoices_batch_id_idx" ON "batch_invoices" USING btree ("batch_id");

-- Step 2: Add user_id as nullable first (required for backfill before NOT NULL)
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "user_id" text;

-- Step 3: Backfill user_id on existing invoices from their batch's user_id
--> statement-breakpoint
UPDATE "invoices" i
SET "user_id" = b."user_id"
FROM "batches" b
WHERE i."batch_id" = b."batch_id";

-- Step 4: Populate batch_invoices from existing invoice rows (must happen before batch_id/source_file are dropped)
--> statement-breakpoint
INSERT INTO "batch_invoices" ("batch_id", "invoice_id", "source_file", "created_at")
SELECT "batch_id", "invoice_id", "source_file", "created_at"
FROM "invoices";

-- Step 5: Enforce user_id NOT NULL now that all rows are backfilled
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 5b: Remove duplicate invoices (same invoice_number + user_id) keeping the earliest row.
-- Also clean up the corresponding batch_invoices rows that pointed to the deleted invoice_ids.
--> statement-breakpoint
DELETE FROM "batch_invoices"
WHERE "invoice_id" IN (
  SELECT "invoice_id" FROM "invoices"
  WHERE "invoice_id" NOT IN (
    SELECT DISTINCT ON ("invoice_number", "user_id") "invoice_id"
    FROM "invoices"
    ORDER BY "invoice_number", "user_id", "created_at" ASC
  )
);
--> statement-breakpoint
DELETE FROM "invoices"
WHERE "invoice_id" NOT IN (
  SELECT DISTINCT ON ("invoice_number", "user_id") "invoice_id"
  FROM "invoices"
  ORDER BY "invoice_number", "user_id", "created_at" ASC
);

-- Step 6: Add unique index on (invoice_number, user_id) to prevent duplicate invoices per user
--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_user_id_idx" ON "invoices" USING btree ("invoice_number","user_id");

-- Step 7: Drop the now-redundant batch_id FK and columns from invoices
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_batch_id_batches_batch_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "batch_id";
--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN "source_file";

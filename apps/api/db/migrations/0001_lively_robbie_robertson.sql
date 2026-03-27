ALTER TABLE "batches" ADD COLUMN "user_id" text;
--> statement-breakpoint
UPDATE "batches" SET "user_id" = 'user_legacy' WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "batches" ALTER COLUMN "user_id" SET NOT NULL;
CREATE INDEX "batches_user_id_created_at_idx" ON "batches" USING btree ("user_id","created_at","batch_id");
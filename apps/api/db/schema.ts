import { pgTable, pgEnum, text, integer, timestamp, jsonb, numeric, char } from 'drizzle-orm/pg-core'
import { type InferSelectModel } from 'drizzle-orm'
import type { LineItem } from '../types/index.ts'

export const batchStatusEnum = pgEnum('batch_status', ['queued', 'processing', 'done', 'failed'])

export const batches = pgTable('batches', {
  batch_id: text('batch_id').primaryKey(),
  status: batchStatusEnum('status').notNull().default('queued'),
  file_type: text('file_type').notNull(),
  file_name: text('file_name').notNull(),
  file_key: text('file_key').notNull(),
  source: text('source'),
  invoice_count: integer('invoice_count'),
  failed_count: integer('failed_count'),
  errors: jsonb('errors').$type<Array<{ file_name: string; reason: string }>>().notNull().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  file_deleted_at: timestamp('file_deleted_at', { withTimezone: true }),
})

export const invoices = pgTable('invoices', {
  invoice_id: text('invoice_id').primaryKey(),
  batch_id: text('batch_id')
    .notNull()
    .references(() => batches.batch_id, { onDelete: 'cascade' }),
  invoice_number: text('invoice_number').notNull(),
  type: text('type').notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  issued_at: timestamp('issued_at', { withTimezone: true }).notNull(),
  issuer_name: text('issuer_name').notNull(),
  issuer_nit: text('issuer_nit').notNull(),
  client_name: text('client_name').notNull(),
  client_nit: text('client_nit').notNull(),
  line_items: jsonb('line_items').$type<LineItem[]>().notNull().default([]),
  source_file: text('source_file').notNull(),
  raw_payload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type BatchSelect = InferSelectModel<typeof batches>
export type InvoiceSelect = InferSelectModel<typeof invoices>

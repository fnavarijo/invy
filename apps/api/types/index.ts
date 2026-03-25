import { batchStatusEnum } from '@invy/db'
import type { LineItem } from '@invy/db'
export type { LineItem }

export type BatchStatus = typeof batchStatusEnum.enumValues[number]

export type FileType = 'zip' | 'xml'

export interface BatchError {
  file_name: string
  reason: string
}

export interface Batch {
  batch_id: string
  status: BatchStatus
  file_type: FileType
  file_name: string
  source: string | null
  invoice_count: number | null
  failed_count: number | null
  errors: BatchError[]
  created_at: string
  completed_at: string | null
}

export interface BatchListItem {
  batch_id: string
  status: BatchStatus
  file_type: FileType
  file_name: string
  source: string | null
  invoice_count: number | null
  failed_count: number | null
  created_at: string
  completed_at: string | null
}

export interface InvoiceListItem {
  invoice_id: string
  batch_id: string
  invoice_number: string
  type: string
  currency: string
  total_amount: string
  issued_at: string
  issuer_name: string
  issuer_nit: string
  client_name: string
  client_nit: string
  source_file: string
  created_at: string
}

export interface Invoice extends InvoiceListItem {
  line_items: LineItem[]
  raw_payload: Record<string, unknown>
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
}

export interface BatchPaginatedResponse extends PaginatedResponse<BatchListItem> {}

export interface InvoicePaginatedResponse extends PaginatedResponse<InvoiceListItem> {
  batch_id?: string
}

export type ErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_PARAM'
  | 'INVALID_CONTENT_TYPE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'

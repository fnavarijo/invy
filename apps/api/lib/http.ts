import type { ErrorResponse } from '../types/index.ts'

export function buildError(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): ErrorResponse {
  return { error: { code, message, details } }
}

export interface CursorPayload {
  cursor_at: string
  id: string
}

export function encodeCursor(cursor_at: string | Date, id: string): string {
  const ts = cursor_at instanceof Date ? cursor_at.toISOString() : cursor_at
  return Buffer.from(JSON.stringify({ cursor_at: ts, id } satisfies CursorPayload)).toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('cursor_at' in parsed) ||
      !('id' in parsed) ||
      typeof (parsed as Record<string, unknown>)['cursor_at'] !== 'string' ||
      typeof (parsed as Record<string, unknown>)['id'] !== 'string'
    ) {
      return null
    }
    const payload = parsed as CursorPayload
    // Reject cursors with invalid timestamps
    if (isNaN(new Date(payload.cursor_at).getTime())) return null
    return payload
  } catch {
    return null
  }
}

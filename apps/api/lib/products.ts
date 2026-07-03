export const PRODUCTS_LIMIT_DEFAULT = 100
export const PRODUCTS_LIMIT_MAX = 500

/**
 * Parse a raw `limit` query value. Returns PRODUCTS_LIMIT_DEFAULT for anything
 * that is not an integer >= 1, otherwise the value clamped to PRODUCTS_LIMIT_MAX.
 * Uses Number() (not parseInt) so values like "250mb" are rejected, not truncated.
 */
export function clampProductsLimit(raw: string | undefined): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return PRODUCTS_LIMIT_DEFAULT
  return Math.min(n, PRODUCTS_LIMIT_MAX)
}

/** ExcelJS number-format string for a money column in the given currency. */
export function productTotalNumFmt(currency: string): string {
  switch (currency) {
    case 'GTQ':
      return '"Q"#,##0.00'
    case 'USD':
      return '"$"#,##0.00'
    default:
      return '#,##0.00'
  }
}

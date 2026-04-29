export const INVOICE_LIMIT_OPTIONS = [25, 50, 100] as const;
export type InvoiceLimitOption = (typeof INVOICE_LIMIT_OPTIONS)[number];

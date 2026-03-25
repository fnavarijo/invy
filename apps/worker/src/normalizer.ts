import Decimal from 'decimal.js'
import type { LineItem } from '@invy/db'
import type { RawInvoice, RawLineItem } from './xml.ts'

export interface NormalizedInvoice {
  invoiceNumber: string
  type: string
  currency: string
  issuedAt: Date
  issuerName: string
  issuerNit: string
  clientName: string
  clientNit: string
  lineItems: LineItem[]
  totalAmount: string
}

function computeTotal(lineItems: RawLineItem[]): string {
  return lineItems
    .reduce((sum, item) => sum.plus(new Decimal(item.total)), new Decimal(0))
    .toFixed(2)
}

function toLineItem(raw: RawLineItem): LineItem {
  return {
    name:       raw.description,
    type:       raw.type,
    quantity:   raw.quantity,
    unit_price: raw.unitPrice,
    total:      raw.total,
  }
}

export function normalizeInvoice(raw: RawInvoice): NormalizedInvoice {
  return {
    invoiceNumber: raw.invoiceNumber,
    type:          raw.type,
    currency:      raw.currency,
    issuedAt:      new Date(raw.issuedDate),
    issuerName:    raw.issuerName.trim(),
    issuerNit:     raw.issuerNit.trim(),
    clientName:    raw.clientName.trim(),
    clientNit:     raw.clientNit.trim(),
    lineItems:     raw.lineItems.map(toLineItem),
    totalAmount:   computeTotal(raw.lineItems),
  }
}

import { XMLParser, XMLValidator } from 'fast-xml-parser'

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,   // keep all attributes as strings — prevents NIT coercion to number
  isArray: (name) => name === 'dte:Item',
})

type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateXsd(content: Buffer): ValidationResult {
  const result = XMLValidator.validate(content.toString(), { allowBooleanAttributes: true })
  if (result !== true) {
    return { ok: false, error: result.err.msg }
  }
  // Structural check: ensure required SAT elements are present
  try {
    const parsed = PARSER.parse(content.toString())
    const root = parsed?.['dte:GTDocumento']?.['dte:SAT']?.['dte:DTE']?.['dte:DatosEmision']
    if (!root) return { ok: false, error: 'Missing required SAT DTE structure' }
    if (!root['dte:DatosGenerales']) return { ok: false, error: 'Missing DatosGenerales' }
    if (!root['dte:Emisor']) return { ok: false, error: 'Missing Emisor' }
    if (!root['dte:Receptor']) return { ok: false, error: 'Missing Receptor' }
    if (!root['dte:Items']) return { ok: false, error: 'Missing Items' }
    if (!root['dte:Totales']) return { ok: false, error: 'Missing Totales' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export interface RawLineItem {
  type: string
  description: string
  quantity: number
  unitPrice: string
  total: string
}

export interface RawInvoice {
  invoiceNumber: string
  type: string
  currency: string
  issuedDate: string
  issuerName: string
  issuerNit: string
  clientName: string
  clientNit: string
  lineItems: RawLineItem[]
  rawPayload: Record<string, unknown>
}

export function extractInvoiceFields(content: Buffer): RawInvoice {
  const parsed = PARSER.parse(content.toString())
  const root = parsed['dte:GTDocumento']['dte:SAT']['dte:DTE']['dte:DatosEmision']
  const certif = parsed['dte:GTDocumento']['dte:SAT']['dte:DTE']['dte:Certificacion']

  const items = root['dte:Items']['dte:Item']
  const lineItems: RawLineItem[] = (Array.isArray(items) ? items : [items]).map((item: Record<string, unknown>) => ({
    type:        String(item['@_BienOServicio'] ?? ''),
    description: String(item['dte:Descripcion']),
    quantity:    Number(item['dte:Cantidad']),
    unitPrice:   String(item['dte:PrecioUnitario']),
    total:       String(item['dte:Total']),
  }))

  return {
    invoiceNumber: certif?.['dte:NumeroAutorizacion']?.['#text'] ?? certif?.['dte:NumeroAutorizacion'],
    type:          root['dte:DatosGenerales']['@_Tipo'],
    currency:      root['dte:DatosGenerales']['@_CodigoMoneda'],
    issuedDate:    root['dte:DatosGenerales']['@_FechaHoraEmision'],
    issuerName:    root['dte:Emisor']['@_NombreComercial'] ?? root['dte:Emisor']['@_NombreEmisor'],
    issuerNit:     root['dte:Emisor']['@_NITEmisor'],
    clientName:    root['dte:Receptor']['@_NombreReceptor'],
    clientNit:     root['dte:Receptor']['@_IDReceptor'],
    lineItems,
    rawPayload:    parsed as Record<string, unknown>,
  }
}

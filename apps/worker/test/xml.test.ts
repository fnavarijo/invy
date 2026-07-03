import { test } from 'node:test'
import assert from 'node:assert'
import { validateXsd, extractInvoiceFields } from '../src/xml.ts'

const VALID_DTE = `<?xml version="1.0" encoding="UTF-8"?>
<dte:GTDocumento xmlns:dte="http://www.sat.gob.gt/dte/fel/0.2.0">
  <dte:SAT>
    <dte:DTE>
      <dte:DatosEmision>
        <dte:DatosGenerales Tipo="FACT" CodigoMoneda="GTQ" FechaHoraEmision="2024-01-15T10:00:00-06:00"/>
        <dte:Emisor NombreComercial="Tienda Ejemplo" NombreEmisor="Tienda Ejemplo SA" NITEmisor="1234567"/>
        <dte:Receptor NombreReceptor="Cliente Ejemplo" IDReceptor="7654321"/>
        <dte:Items>
          <dte:Item BienOServicio="B">
            <dte:Descripcion>Producto A</dte:Descripcion>
            <dte:Cantidad>2</dte:Cantidad>
            <dte:PrecioUnitario>50.00</dte:PrecioUnitario>
            <dte:Total>100.00</dte:Total>
          </dte:Item>
        </dte:Items>
        <dte:Totales>
          <dte:GranTotal>100.00</dte:GranTotal>
        </dte:Totales>
      </dte:DatosEmision>
      <dte:Certificacion>
        <dte:NumeroAutorizacion>AUTH-123</dte:NumeroAutorizacion>
      </dte:Certificacion>
    </dte:DTE>
  </dte:SAT>
</dte:GTDocumento>`

test('validateXsd returns ok with the parsed doc for a valid DTE', () => {
  const result = validateXsd(Buffer.from(VALID_DTE))
  assert.strictEqual(result.ok, true)
  if (result.ok) assert.ok(result.doc['dte:GTDocumento'])
})

test('validateXsd rejects malformed XML', () => {
  const result = validateXsd(Buffer.from('<not-closed>'))
  assert.strictEqual(result.ok, false)
})

test('validateXsd rejects XML missing SAT structure', () => {
  const result = validateXsd(Buffer.from('<root><child>x</child></root>'))
  assert.strictEqual(result.ok, false)
})

test('extractInvoiceFields reads fields from an already-parsed doc', () => {
  const result = validateXsd(Buffer.from(VALID_DTE))
  assert.strictEqual(result.ok, true)
  if (!result.ok) return
  const fields = extractInvoiceFields(result.doc)
  assert.strictEqual(fields.invoiceNumber, 'AUTH-123')
  assert.strictEqual(fields.type, 'FACT')
  assert.strictEqual(fields.currency, 'GTQ')
  assert.strictEqual(fields.issuerNit, '1234567')
  assert.strictEqual(fields.clientNit, '7654321')
  assert.strictEqual(fields.lineItems.length, 1)
  assert.strictEqual(fields.lineItems[0].description, 'Producto A')
  assert.strictEqual(fields.lineItems[0].quantity, 2)
})

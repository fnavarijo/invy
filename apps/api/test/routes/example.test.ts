import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helper.ts'

test('example is loaded', async (t) => {
  const app = await build(t)
  const res = await app.inject({ url: '/example', headers: { authorization: 'Bearer test-token' } })
  assert.equal(res.payload, 'this is an example')
})

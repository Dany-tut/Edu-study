import { strict as assert } from 'node:assert'
import { isAssistantToken, mfaPending } from './mfa.ts'

const jwt = (claims: Record<string, unknown>) => `Bearer h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`

Deno.test('токен ИИ-помощника (client_id) не принимается функциями с сервисным ключом', () => {
  const assistant = jwt({ sub: 'u', aal: 'aal2', client_id: 'c-1' })
  assert.equal(isAssistantToken(assistant), true)
  assert.equal(mfaPending({ factors: [] }, assistant), true)
  assert.equal(mfaPending(null, assistant), true)
})

Deno.test('обычные входы ведут себя как раньше', () => {
  const plain = jwt({ sub: 'u', aal: 'aal1' })
  assert.equal(isAssistantToken(plain), false)
  assert.equal(isAssistantToken(jwt({ sub: 'u', client_id: '' })), false)
  assert.equal(isAssistantToken(''), false)
  assert.equal(isAssistantToken('Bearer garbage'), false)
  assert.equal(mfaPending({ factors: [] }, plain), false)
  assert.equal(mfaPending({ factors: [{ status: 'verified' }] }, plain), true)
  assert.equal(mfaPending({ factors: [{ status: 'verified' }] }, jwt({ sub: 'u', aal: 'aal2' })), false)
})

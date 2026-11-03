import assert from 'node:assert/strict'
import { languageAiConfig, requestLanguageAi, LanguageAiError, retryLanguageAi, languageAiUserMessage } from '../supabase/functions/_shared/languageAi.ts'

const legacyModels = ['legacy-model']
const legacyUrl = 'https://api.kie.ai/claude/v1/messages'
const config = values => languageAiConfig(name => values[name], legacyModels, legacyUrl)
const dedicated = config({ LINALI_API_KEY: ' dedicated ', AI_API_KEY: 'old', LINALI_HW_MODEL: 'configured-model' })
assert.equal(dedicated.provider, 'linali')
assert.equal(dedicated.key, 'dedicated')
assert.deepEqual(dedicated.models, ['configured-model'])
assert.equal(dedicated.url, 'https://api.linaliapi.com/v1/chat/completions')
assert.equal(config({ KIE_API_KEY: 'old' }).provider, 'kie', 'legacy credential needs explicit opt-in for a different provider')
assert.equal(config({ KIE_API_KEY: 'shared', LINALI_KEY_SOURCE: 'KIE_API_KEY' }).provider, 'linali')
assert.equal(config({ LINALI_API_KEY: 'new', LINALI_LANGUAGE_MODEL: 'language-model', LINALI_HW_MODEL: 'homework-model' }).models[0], 'language-model')
const legacy = config({ AI_API_KEY: 'old' })
assert.equal(legacy.url, legacyUrl)
assert.deepEqual(legacy.models, legacyModels)

const request = { model: dedicated.models[0], system: 'rules', maxTokens: 100, content: [
  { type: 'text', text: 'sample' },
  { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'YWJj' } },
] }
const response = body => new Response(JSON.stringify(body), { status: 200 })
let calls = 0
assert.equal(await requestLanguageAi(dedicated, request, { fetcher: async (url, init) => {
  calls++
  assert.equal(url, dedicated.url)
  assert.equal(init.headers.Authorization, 'Bearer dedicated')
  assert.equal(init.headers['anthropic-version'], undefined)
  const body = JSON.parse(init.body)
  assert.equal(body.model, 'configured-model')
  assert.equal(body.messages[0].role, 'system')
  assert.equal(body.messages[0].content, 'rules')
  assert.deepEqual(body.messages[1].content[1], { type: 'image_url', image_url: { url: 'data:image/png;base64,YWJj' } })
  return response({ choices: [{ message: { content: ' result ' } }] })
} }), 'result')
assert.equal(await requestLanguageAi(legacy, request, { fetcher: async (_, init) => {
  const body = JSON.parse(init.body)
  assert.equal(init.headers['anthropic-version'], '2023-06-01')
  assert.equal(body.system, 'rules')
  assert.deepEqual(body.messages[0].content, request.content)
  return response({ content: [{ type: 'text', text: 'legacy result' }] })
} }), 'legacy result')
assert.equal(await requestLanguageAi(dedicated, request, { fetcher: async () => response({ choices: [{ message: { content: [{ type: 'text', text: 'part1' }, { type: 'text', text: 'part2' }] } }] }) }), 'part1part2')
for (const [status, code, retryable] of [[401, 'credentials', false], [403, 'credentials', false], [402, 'balance', false], [429, 'rate_limit', true], [500, 'unavailable', true], [504, 'timeout', true], [400, 'invalid_result', false]]) {
  await assert.rejects(requestLanguageAi(dedicated, request, { fetcher: async () => new Response('secret provider body', { status }) }), error => {
    assert.ok(error instanceof LanguageAiError)
    assert.equal(error.code, code)
    assert.equal(retryLanguageAi(error), retryable)
    assert.doesNotMatch(error.message + languageAiUserMessage(error), /secret|dedicated|API|401|request_id/)
    return true
  })
}
await assert.rejects(requestLanguageAi(config({}), request, { fetcher: async () => { calls++; throw new Error('must not call') } }), error => error.code === 'configuration')
assert.equal(calls, 1)
for (const body of [{}, { choices: [{ message: { content: '' } }] }, { error: { message: 'secret' } }]) {
  await assert.rejects(requestLanguageAi(dedicated, request, { fetcher: async () => response(body) }), error => error instanceof LanguageAiError && error.retryable && !error.message.includes('secret'))
}
await assert.rejects(requestLanguageAi(dedicated, request, { fetcher: async () => new Response('{') }), error => error.code === 'invalid_result')
await assert.rejects(requestLanguageAi(dedicated, request, { timeoutMs: 1, fetcher: async (_, init) => {
  await new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
    setTimeout(resolve, 100)
  })
  return response({})
} }), error => error.code === 'timeout' && error.retryable)
console.log('✓ Language AI: provider selection, credential boundary, text/vision protocols, parsing, retries and safe errors')

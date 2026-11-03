import { resolveLinaliKey } from './homeworkAiKey.ts'

export type LanguageAiCode = 'configuration' | 'credentials' | 'balance' | 'rate_limit' | 'timeout' | 'unavailable' | 'invalid_result'
export class LanguageAiError extends Error {
  constructor(public code: LanguageAiCode, public retryable = false, public providerStatus?: number) {
    super(code)
    this.name = 'LanguageAiError'
  }
}
export type LanguageContent = Array<
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
>
export type LanguageAiConfig = { provider: 'linali' | 'kie'; key?: string; models: string[]; url: string }

/** Follow the already configured homework provider. A legacy secret name does
 * not authorize sending its value to another provider without explicit setup. */
export function languageAiConfig(env: (key: string) => string | undefined, legacyModels: string[], legacyUrl: string): LanguageAiConfig {
  const key = resolveLinaliKey(env('LINALI_API_KEY'), env('KIE_API_KEY'), env('LINALI_KEY_SOURCE') === 'KIE_API_KEY')
  if (key) return {
    provider: 'linali', key,
    models: [env('LINALI_LANGUAGE_MODEL')?.trim() || env('LINALI_HW_MODEL')?.trim() || 'anthropic/claude-opus-5.5'],
    url: 'https://api.linaliapi.com/v1/chat/completions',
  }
  return { provider: 'kie', key: env('AI_API_KEY')?.trim() || env('KIE_API_KEY')?.trim(), models: [...legacyModels], url: legacyUrl }
}

export function languageAiUserMessage(error: unknown): string {
  if (error instanceof LanguageAiError) {
    if (error.code === 'rate_limit') return 'Сейчас много запросов к ИИ. Попробуйте немного позже.'
    if (error.code === 'timeout') return 'ИИ не успел ответить. Попробуйте ещё раз.'
    if (error.code === 'configuration' || error.code === 'credentials' || error.code === 'balance') return 'Сервис ИИ сейчас недоступен. Попробуйте позже.'
  }
  return 'Не удалось получить ответ ИИ. Попробуйте ещё раз.'
}

export function retryLanguageAi(error: unknown): boolean {
  return !(error instanceof LanguageAiError) || error.retryable
}

function providerError(status: number): LanguageAiError {
  return status === 401 || status === 403 ? new LanguageAiError('credentials', false, status)
    : status === 402 ? new LanguageAiError('balance', false, status)
    : status === 429 ? new LanguageAiError('rate_limit', true, status)
    : status === 408 || status === 504 ? new LanguageAiError('timeout', true, status)
    : status >= 500 ? new LanguageAiError('unavailable', true, status)
    : new LanguageAiError('invalid_result', false, status)
}

/** Provider bodies, credentials and input content never become error text. */
export async function requestLanguageAi(config: LanguageAiConfig, request: {
  model: string; system: string; content: LanguageContent; maxTokens: number;
}, options: { fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<string> {
  if (!config.key || !request.model) throw new LanguageAiError('configuration')
  const content = request.content.map(part => part.type === 'text' ? part : {
    type: 'image_url', image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` },
  })
  const headers: Record<string, string> = { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' }
  if (config.provider === 'kie') headers['anthropic-version'] = '2023-06-01'
  const body = config.provider === 'linali'
    ? { model: request.model, max_tokens: request.maxTokens, stream: false, messages: [{ role: 'system', content: request.system }, { role: 'user', content }] }
    : { model: request.model, max_tokens: request.maxTokens, system: request.system, messages: [{ role: 'user', content: request.content }] }
  let response: Response
  try {
    response = await (options.fetcher ?? fetch)(config.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) })
  } catch (error) {
    throw new LanguageAiError(error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name) ? 'timeout' : 'unavailable', true)
  }
  if (!response.ok) throw providerError(response.status)
  let data: Record<string, any>
  try { data = await response.json() } catch { throw new LanguageAiError('invalid_result', true) }
  if (data?.error) throw new LanguageAiError('unavailable', true)
  const value = config.provider === 'linali' ? data?.choices?.[0]?.message?.content : data?.content
  const text = typeof value === 'string' ? value : Array.isArray(value) ? value.filter(p => p?.type === 'text' && typeof p.text === 'string').map(p => p.text).join('') : ''
  if (!text.trim()) throw new LanguageAiError('invalid_result', true)
  return text.trim()
}

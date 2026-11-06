// Вызов шлюза ИИ (kie.ai или другой с тем же контрактом) — та же схема, что в
// analytics-digest: AI_BASE_URL — корень шлюза, ответ всегда стримом (только в
// потоке видна настоящая причина отказа, например no_available_account), формат
// запроса выбирается по имени модели (claude-* — Anthropic Messages, остальные —
// OpenAI Responses).

export const AI_API_URL = (Deno.env.get('AI_BASE_URL') ?? 'https://api.kie.ai/claude') + '/v1/messages'

export const isClaude = (model: string) => model.includes('claude')

export type ModelAnswer = { text: string; tokensIn: number; tokensOut: number }

export async function askModel(
  key: string, model: string, system: string, prompt: string, maxTokens: number,
): Promise<ModelAnswer> {
  const body = isClaude(model)
    ? { model, max_tokens: maxTokens, stream: true, system, messages: [{ role: 'user', content: prompt }] }
    : { model, max_output_tokens: maxTokens, stream: true, instructions: system, input: prompt }

  const res = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok || !res.body) {
    throw new Error(`шлюз ИИ HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }

  let text = '', tokensIn = 0, tokensOut = 0, buf = ''
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.split('\n').find(l => l.startsWith('data:'))
      if (!line) continue
      let ev: Record<string, unknown>
      try { ev = JSON.parse(line.slice(5).trim()) } catch { continue }
      const type = String(ev.type ?? '')
      if (type === 'error' || type === 'response.failed') {
        const e = (ev.error ?? (ev.response as { error?: unknown })?.error) as { message?: string } | undefined
        throw new Error(`шлюз ИИ: ${e?.message ?? ev.message ?? 'unknown error'}`)
      }
      if (type === 'content_block_delta') {
        const d = ev.delta as { text?: string } | undefined
        if (d?.text) text += d.text
      }
      if (type === 'message_start') {
        tokensIn = (ev.message as { usage?: { input_tokens?: number } })?.usage?.input_tokens ?? 0
      }
      if (type === 'message_delta') {
        tokensOut = (ev.usage as { output_tokens?: number } | undefined)?.output_tokens ?? tokensOut
      }
      if (type === 'response.output_text.delta' && typeof ev.delta === 'string') text += ev.delta
      if (type === 'response.completed' || type === 'response.incomplete') {
        const u = (ev.response as { usage?: { input_tokens?: number; output_tokens?: number } })?.usage
        tokensIn = u?.input_tokens ?? tokensIn
        tokensOut = u?.output_tokens ?? tokensOut
      }
    }
  }
  if (!text.trim()) throw new Error('шлюз ИИ вернул пустой ответ')
  return { text, tokensIn, tokensOut }
}

/**
 * Перебор моделей в два прохода: у kie.ai пул аккаунтов свой на каждую модель
 * и пустеет независимо. `accept` может отклонить ответ (например, не JSON) —
 * тогда пробуется следующая модель.
 */
export async function askFirstAvailable<T>(
  key: string, models: string[], system: string, prompt: string, maxTokens: number,
  accept: (a: ModelAnswer) => T,
): Promise<{ value: T; answer: ModelAnswer; model: string }> {
  const failures = new Map<string, string>()
  for (let round = 0; round < 2; round++) {
    for (const model of models) {
      try {
        const answer = await askModel(key, model, system, prompt, maxTokens)
        return { value: accept(answer), answer, model }
      } catch (e) {
        failures.set(model, e instanceof Error ? e.message : String(e))
      }
    }
    if (round === 0) await new Promise(r => setTimeout(r, 3000))
  }
  const reasons = [...new Set(failures.values())]
  throw new Error(reasons.length === 1
    ? `${reasons[0]} (проверены: ${models.join(', ')})`
    : [...failures].map(([m, e]) => `${m} — ${e}`).join('; ') || 'Модель не ответила')
}

export function modelList(envName: string, fallback: string): string[] {
  return (Deno.env.get(envName) ?? fallback).split(',').map(m => m.trim()).filter(Boolean)
}

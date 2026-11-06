// Edge Function: итоги урока из расшифровки.
//
// Учитель нажимает «Собрать итоги» → сюда приходит short_id урока и список
// нужных видов (summary, questions, cards, hw, note). Функция:
//   • проверяет по порядку: рубильники ai_enabled + ai_lesson_recap (409) →
//     доступ lesson_recap и переключатель учителя (403) → владельца урока →
//     дневной лимит (20 сборок за сутки);
//   • берёт СОХРАНЁННУЮ расшифровку из lessons.content.transcript, нумерует
//     реплики и заменяет имена на «Учитель / Ученик А» — наружу не уходят ни
//     имена, ни видео, ни голос;
//   • зовёт модель один раз (общий languageAiConfig, как у cards-extract);
//   • проверяет ответ: номера реплик в диапазоне, пустые пункты выкинуты,
//     длины обрезаны; таймкоды считает сама по сегментам;
//   • пишет черновик в lesson_recaps со статусом ready.
//
// В урок, наборы карточек и ДЗ функция НЕ пишет. Раскладывает клиент по
// нажатию учителя — существующими путями сохранения, с теми же правами.
//
// Повторный запуск по той же расшифровке отдаёт сохранённый черновик
// (transcript_hash) и денег не тратит. «Пересобрать раздел» (recap + kinds)
// собирает один вид и вливает его в прошлый черновик новой строкой.
//
// Запрос:  POST { lesson: short_id, kinds: RecapKind[], lang?, recap?: uuid, force?: boolean }
// Ответ:   { recap: строка lesson_recaps, cached?: true } | { error, code }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { languageAiConfig, languageAiUserMessage, requestLanguageAi, LanguageAiError, type LanguageAiConfig } from '../_shared/languageAi.ts'
import {
  extractJson, mergeRecap, numberLines, parseRecap, readKinds, recapCost, recapSize, recapSystem, recapUser, transcriptKey,
  type RecapDraft, type RecapKind, type RecapSegment, type RecapSpeaker,
} from '../_shared/lessonRecap.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const API_URL = (Deno.env.get('AI_BASE_URL') ?? 'https://api.kie.ai/claude') + '/v1/messages'
// Пересказ и вопросы — задача без развилок: начинаем с середины линейки.
const LEGACY_MODELS = (Deno.env.get('AI_RECAP_MODELS') ?? Deno.env.get('AI_MODELS') ?? 'claude-sonnet-4-5,claude-opus-4-8')
  .split(',').map(m => m.trim()).filter(Boolean)
const DAILY_LIMIT = 20
const ROW = 'id, lesson_id, status, kinds, draft, published, model, cost_usd, error_code, created_at, updated_at'

Deno.serve(async req => {
  try {
    return await handle(req)
  } catch (e) {
    console.error('lesson-recap', e instanceof Error ? e.message : e)
    return json({ error: languageAiUserMessage(e), code: 'failed' }, 502)
  }
})

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function segmentsOf(value: unknown): { segments: RecapSegment[]; speakers: RecapSpeaker[] } {
  const t = value && typeof value === 'object' ? value as { segments?: unknown; speakers?: unknown } : {}
  const segments = (Array.isArray(t.segments) ? t.segments : [])
    .filter((s): s is RecapSegment => !!s && typeof s === 'object' && typeof (s as RecapSegment).text === 'string' && Number.isFinite((s as RecapSegment).start))
  const speakers = (Array.isArray(t.speakers) ? t.speakers : [])
    .filter((s): s is RecapSpeaker => !!s && typeof s === 'object' && typeof (s as RecapSpeaker).id === 'string' && typeof (s as RecapSpeaker).label === 'string')
    .map(s => ({ id: s.id, label: s.label, role: s.role === 'teacher' ? 'teacher' as const : 'student' as const }))
  return { segments, speakers }
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: auth } = await caller.auth.getUser()
  const user = auth?.user
  if (!user) return json({ error: 'Не авторизован', code: 'auth' }, 401)
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // ── Рубильник ────────────────────────────────────────────────────────────
  // База не ответила — считаем выключенным: деньги без явного «да» не тратим.
  const { data: flags } = await admin.from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_lesson_recap'])
  if (!['ai_enabled', 'ai_lesson_recap'].every(k => flags?.find(f => f.key === k)?.enabled))
    return json({ error: 'Итоги урока выключены в админке', code: 'off' }, 409)

  // ── Доступ учителя ───────────────────────────────────────────────────────
  // Общий механизм доступа к автоматизациям (миграция teacher_features):
  // админ выдал ключ lesson_recap и учитель не выключил его в «Настройках».
  // my_features зовём от имени учителя — так же, как его видит клиент. База не
  // ответила — считаем, что доступа нет.
  const { data: features, error: featuresError } = await caller.rpc('my_features')
  const access = !featuresError && (features as Array<{ feature: string; enabled: boolean }> | null)?.some(f => f.feature === 'lesson_recap' && f.enabled)
  if (!access) return json({ error: 'Итоги урока не включены для вашего кабинета', code: 'no_access' }, 403)

  let body: { lesson?: string; kinds?: unknown; lang?: string; recap?: string; force?: boolean }
  try { body = await req.json() } catch { return json({ error: 'Пустой запрос', code: 'bad_request' }, 400) }
  const kinds = readKinds(body.kinds)
  const shortId = String(body.lesson ?? '').trim()
  if (!shortId || !kinds.length) return json({ error: 'Не указан урок или что собирать', code: 'bad_request' }, 400)
  const lang = /^[a-z]{2}(-[A-Z]{2})?$/.test(String(body.lang ?? '')) ? String(body.lang) : ''

  // ── Урок и владелец ──────────────────────────────────────────────────────
  const { data: lesson } = await admin.from('lessons')
    .select('id, title, content, courses!inner(created_by, title, subject, student_ids, group_ids)')
    .eq('short_id', shortId).maybeSingle()
  const course = (lesson as { courses?: { created_by: string | null; title: string | null; subject: string | null; student_ids: string[] | null; group_ids: string[] | null } } | null)?.courses
  if (!lesson || !course) return json({ error: 'Урок не найден', code: 'not_found' }, 404)
  if (course.created_by !== user.id) {
    const { data: isAdmin } = await caller.rpc('is_admin')
    if (!isAdmin) return json({ error: 'Это не ваш урок', code: 'forbidden' }, 403)
  }
  const content = (lesson.content ?? {}) as { transcript?: unknown; paragraphs?: Array<{ text?: string; origin?: string }> }
  const { segments, speakers } = segmentsOf(content.transcript)
  const { lines, aliases } = numberLines(segments, speakers, await rosterNames(admin, course.student_ids ?? [], course.group_ids ?? []))
  if (lines.length < 3) return json({ error: 'Сначала расшифруйте и сохраните запись урока', code: 'no_transcript' }, 422)
  const hash = await sha256(transcriptKey(segments, speakers))

  // ── Прошлый черновик ─────────────────────────────────────────────────────
  // «Пересобрать раздел» вливает новый вид в прошлый черновик той же расшифровки.
  let base: { id: string; draft: RecapDraft } | null = null
  if (body.recap) {
    const { data } = await admin.from('lesson_recaps').select('id, draft, transcript_hash')
      .eq('id', body.recap).eq('lesson_id', lesson.id).eq('teacher_id', user.id).maybeSingle()
    if (data?.draft && data.transcript_hash === hash) base = { id: data.id, draft: data.draft as RecapDraft }
  } else if (!body.force) {
    const { data } = await admin.from('lesson_recaps').select(ROW)
      .eq('lesson_id', lesson.id).eq('teacher_id', user.id).eq('transcript_hash', hash)
      .in('status', ['ready', 'published']).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data && kinds.every(k => (data.kinds as string[]).includes(k))) return json({ recap: data, cached: true })
  }

  // ── Лимит ────────────────────────────────────────────────────────────────
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin.from('lesson_recaps').select('id', { count: 'exact', head: true })
    .eq('teacher_id', user.id).gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) return json({ error: `Сегодня уже ${DAILY_LIMIT} сборок итогов. Попробуйте завтра.`, code: 'limit' }, 429)

  const gateway = languageAiConfig(name => Deno.env.get(name), LEGACY_MODELS, API_URL)
  if (!gateway.key) return json({ error: 'Сервис ИИ сейчас недоступен. Попробуйте позже.', code: 'unavailable' }, 503)

  const allKinds = base ? [...new Set([...(Object.keys(base.draft).filter(k => ['summary', 'questions', 'cards', 'hw', 'note'].includes(k)) as RecapKind[]), ...kinds])] : kinds
  const { data: row, error: insertError } = await admin.from('lesson_recaps').insert({
    lesson_id: lesson.id, teacher_id: user.id, transcript_hash: hash, kinds: allKinds, status: 'running',
  }).select('id').single()
  if (insertError || !row) throw new Error('insert_failed')

  const existing = (content.paragraphs ?? []).filter(p => p?.origin !== 'recap' && typeof p?.text === 'string')
    .map(p => p.text!.split('\n')[0].replace(/^#+\s*/, '').slice(0, 70)).filter(Boolean).slice(0, 10)
  try {
    const { text, model, usage } = await ask(gateway, recapSystem(kinds), recapUser({
      course: course.title ?? undefined, lesson: lesson.title ?? undefined, subject: course.subject ?? undefined, existing, kinds, lines,
    }))
    let draft: RecapDraft
    try { draft = parseRecap(extractJson(text), kinds, lines, { lang, aliases }) } catch { throw new LanguageAiError('invalid_result', true) }
    if (!recapSize(draft)) throw new LanguageAiError('invalid_result', true)
    if (base) draft = mergeRecap(base.draft, draft, kinds)
    const { data: done } = await admin.from('lesson_recaps').update({
      status: 'ready', draft, model, input_tokens: usage.input, output_tokens: usage.output,
      cost_usd: recapCost(model, usage.input, usage.output),
    }).eq('id', row.id).select(ROW).single()
    if (base) await admin.from('lesson_recaps').update({ status: 'discarded' }).eq('id', base.id).neq('status', 'published')
    return json({ recap: done })
  } catch (e) {
    await admin.from('lesson_recaps').update({ status: 'failed', error_code: e instanceof LanguageAiError ? e.code : 'failed' }).eq('id', row.id)
    return json({ error: languageAiUserMessage(e), code: e instanceof LanguageAiError ? e.code : 'failed' }, 502)
  }
}

/** Имена учеников курса — их упоминания в репликах тоже не уходят модели. */
// deno-lint-ignore no-explicit-any
async function rosterNames(admin: any, studentIds: string[], groupIds: string[]): Promise<string[]> {
  const out: string[] = []
  if (studentIds.length) {
    const { data } = await admin.from('students').select('name').in('id', studentIds.slice(0, 500))
    out.push(...((data ?? []) as Array<{ name?: string }>).map(r => String(r.name ?? '')))
  }
  if (groupIds.length) {
    const { data } = await admin.from('students').select('name').in('group_id', groupIds.slice(0, 100))
    out.push(...((data ?? []) as Array<{ name?: string }>).map(r => String(r.name ?? '')))
  }
  return [...new Set(out.map(x => x.trim()).filter(Boolean))]
}

/** Модели по очереди: недоступная или неизвестная шлюзу модель не отменяет сборку. */
async function ask(config: LanguageAiConfig, system: string, user: string) {
  const preferred = Deno.env.get('LINALI_RECAP_MODEL')?.trim()
  const models = [...new Set([...(config.provider === 'linali' && preferred ? [preferred] : []), ...config.models])]
  let last: unknown
  for (const model of models) {
    const usage = { input: 0, output: 0 }
    try {
      const text = await requestLanguageAi(config, { model, system, content: [{ type: 'text', text: user }], maxTokens: 8000 },
        { timeoutMs: 120_000, onUsage: u => Object.assign(usage, u) })
      // Шлюз не прислал расход — оцениваем по длине (≈ 3,5 символа на токен).
      if (!usage.input) Object.assign(usage, { input: Math.round((system.length + user.length) / 3.5), output: Math.round(text.length / 3.5) })
      return { text, model, usage }
    } catch (e) {
      last = e
      const next = e instanceof LanguageAiError && (e.retryable || e.providerStatus === 400 || e.providerStatus === 404)
      if (!next) throw e
    }
  }
  throw last
}

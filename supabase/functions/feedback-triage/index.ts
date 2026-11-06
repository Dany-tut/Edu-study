// Edge Function: сортировка обратной связи и недельная сводка.
//
// mode = 'classify' — берёт обращения в состоянии pending (из формы и Telegram,
//   их заводят триггеры миграции 20261106120000), спрашивает модель про тип,
//   экран и тему, пишет ответ в feedback_items / feedback_topics. Cron зовёт
//   каждые 10 минут, если есть что разбирать; админ — кнопкой.
// mode = 'digest' — собирает admin_feedback_digest_input(days), добавляет
//   выдержку из Sentry (если задан SENTRY_AUTH_TOKEN), просит модель написать
//   «что болит чаще всего» и кладёт текст в feedback_digests. Cron — по
//   понедельникам; админ — кнопкой. Если задан FEEDBACK_DIGEST_TG_CHAT, текст
//   уходит ещё и в Telegram этим ботом (TELEGRAM_BOT_TOKEN).
//
// Авторизация — как у analytics-digest: cron по x-digest-secret = DIGEST_SECRET,
// либо админ по JWT (роль из app_metadata, перечитанная service_role).
// Флаги: работа идёт, только если подняты ai_enabled и ai_feedback_triage.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { askFirstAvailable, modelList } from '../_shared/aiGateway.ts'
import {
  buildClassifyPrompt, CLASSIFY_SYSTEM, DIGEST_SYSTEM, extractJson, parseDecisions, pickSentryIssues,
  type Correction, type KnownTopic, type PendingItem,
} from './triage.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-digest-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

// Сортировка — короткая задача без развилок: дешёвая модель первой.
const CLASSIFY_MODELS = modelList('AI_TRIAGE_MODELS', 'claude-haiku-4-5,claude-sonnet-4-5,gpt-5-6-sol')
const DIGEST_MODELS = modelList('AI_MODELS', Deno.env.get('KIE_MODELS') ?? 'claude-sonnet-4-5,claude-opus-4-8,claude-haiku-4-5,gpt-5-6-sol')
const BATCH = 20
const MAX_ATTEMPTS = 3

async function classify(admin: SupabaseClient, key: string) {
  const { data: pending, error } = await admin
    .from('feedback_items')
    .select('id, source, section, body, triage_attempts')
    .eq('triage_state', 'pending').lt('triage_attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true }).limit(BATCH)
  if (error) throw new Error(`обращения не прочитались: ${error.message}`)
  if (!pending?.length) return { classified: 0, failed: 0, new_topics: 0 }

  // Темы: открытые, с активностью за 120 дней. Счётчик и пример — чтобы модель
  // видела, что внутри, а не только заголовок.
  const since = new Date(Date.now() - 120 * 864e5).toISOString()
  const { data: topicRows } = await admin
    .from('feedback_topics').select('id, kind, screen, title, updated_at')
    .eq('status', 'open').gt('updated_at', since).order('updated_at', { ascending: false }).limit(80)
  const topicIds = (topicRows ?? []).map(t => t.id)
  const { data: members } = topicIds.length
    ? await admin.from('feedback_items').select('topic_id, body, last_at').in('topic_id', topicIds).order('last_at', { ascending: false })
    : { data: [] as { topic_id: string; body: string }[] }
  const topics: KnownTopic[] = (topicRows ?? []).map(t => {
    const own = (members ?? []).filter(m => m.topic_id === t.id)
    return { id: t.id, kind: t.kind, screen: t.screen, title: t.title, count: own.length, example: own[0]?.body ?? null }
  })

  // Последние ручные правки — примеры для модели.
  const { data: corr } = await admin
    .from('feedback_items').select('body, kind, screen, topic_id, feedback_topics(title)')
    .or('kind_by.eq.admin,topic_by.eq.admin').order('triaged_at', { ascending: false }).limit(8)
  const corrections: Correction[] = (corr ?? []).map(c => ({
    body: c.body, kind: c.kind, screen: c.screen,
    topic: (c.feedback_topics as unknown as { title?: string } | null)?.title ?? null,
  }))

  const items: PendingItem[] = pending.map(p => ({ id: p.id, source: p.source, section: p.section, body: p.body }))
  const { prompt, itemKeys, topicKeys } = buildClassifyPrompt(items, topics, corrections)

  let result
  try {
    result = await askFirstAvailable(key, CLASSIFY_MODELS, CLASSIFY_SYSTEM, prompt, 3000,
      a => parseDecisions(extractJson(a.text), itemKeys, topicKeys))
  } catch (e) {
    // Модель недоступна: попытка засчитывается всем, после трёх — failed, и
    // строка ждёт ручного разбора или кнопки «Разобрать заново».
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    for (const p of pending) {
      const attempts = p.triage_attempts + 1
      await admin.from('feedback_items').update({
        triage_attempts: attempts, triage_error: msg,
        ...(attempts >= MAX_ATTEMPTS ? { triage_state: 'failed' } : {}),
      }).eq('id', p.id).eq('triage_state', 'pending')
    }
    throw e
  }

  const { decisions, newTopics } = result.value
  const created = new Map<string, string>()
  for (const nt of newTopics) {
    // Новую тему заводим, только если на неё кто-то сослался.
    if (!decisions.some(d => d.newTopicKey === nt.key)) continue
    const { data } = await admin.from('feedback_topics')
      .insert({ kind: nt.kind, screen: nt.screen, title: nt.title, summary: nt.summary, source: 'model' })
      .select('id').single()
    if (data) created.set(nt.key, data.id)
  }

  const now = new Date().toISOString()
  const touched = new Set<string>()
  const { data: current } = await admin.from('feedback_items')
    .select('id, kind_by, topic_by').in('id', decisions.map(d => d.id))
  for (const d of decisions) {
    const row = current?.find(c => c.id === d.id)
    const topic = d.topicId ?? (d.newTopicKey ? created.get(d.newTopicKey) ?? null : null)
    const patch: Record<string, unknown> = {
      triage_state: 'done', triage_error: null, triaged_at: now, model: result.model,
    }
    // Ручная правка админа сильнее модели.
    if (row?.kind_by !== 'admin') Object.assign(patch, { kind: d.kind, screen: d.screen, kind_by: 'model' })
    if (row?.topic_by !== 'admin') Object.assign(patch, { topic_id: topic, topic_by: topic ? 'model' : null })
    // eq(triage_state, pending): если админ поправил строку, пока думала
    // модель, его правка не затирается.
    await admin.from('feedback_items').update(patch).eq('id', d.id).eq('triage_state', 'pending')
    if (topic) touched.add(topic)
  }
  if (touched.size) await admin.from('feedback_topics').update({ updated_at: now }).in('id', [...touched])

  // Кого модель пропустила — на повтор.
  const decided = new Set(decisions.map(d => d.id))
  let failed = 0
  for (const p of pending.filter(p => !decided.has(p.id))) {
    const attempts = p.triage_attempts + 1
    if (attempts >= MAX_ATTEMPTS) failed++
    await admin.from('feedback_items').update({
      triage_attempts: attempts, triage_error: 'модель пропустила обращение',
      ...(attempts >= MAX_ATTEMPTS ? { triage_state: 'failed' } : {}),
    }).eq('id', p.id).eq('triage_state', 'pending')
  }

  return {
    classified: decisions.length, failed, new_topics: created.size, model: result.model,
    tokens_in: result.answer.tokensIn, tokens_out: result.answer.tokensOut,
  }
}

async function sentryIssues() {
  const token = Deno.env.get('SENTRY_AUTH_TOKEN')
  if (!token) return { configured: false }
  const api = Deno.env.get('SENTRY_API_URL') ?? 'https://de.sentry.io'
  const org = Deno.env.get('SENTRY_ORG') ?? 'iskra-b9'
  const project = Deno.env.get('SENTRY_PROJECT') ?? 'iskra-web'
  try {
    const res = await fetch(
      `${api}/api/0/projects/${org}/${project}/issues/?statsPeriod=14d&query=${encodeURIComponent('is:unresolved')}&sort=freq&limit=20`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { configured: true, error: `HTTP ${res.status}` }
    return { configured: true, issues: pickSentryIssues(await res.json()) }
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : String(e) }
  }
}

async function sendToTelegram(text: string) {
  const chat = Deno.env.get('FEEDBACK_DIGEST_TG_CHAT')
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!chat || !token) return false
  const body = `Сводка обратной связи за неделю\n\n${text}`.slice(0, 4000)
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: body, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  return Boolean(res?.ok)
}

async function digest(admin: SupabaseClient, key: string, days: number) {
  const { data: stats, error } = await admin.rpc('admin_feedback_digest_input', { p_days: days })
  if (error) throw new Error(`сводка не собралась: ${error.message}`)
  const full: Record<string, unknown> = { ...(stats as Record<string, unknown>), sentry: await sentryIssues() }
  const items = Number((full.totals as { items?: number } | undefined)?.items ?? 0)

  // Пустая неделя — без платного вызова.
  let body: string, model = 'none', tokensIn = 0, tokensOut = 0
  if (items === 0) {
    body = `За ${days} дн. обращений не было.`
  } else {
    const r = await askFirstAvailable(key, DIGEST_MODELS, DIGEST_SYSTEM,
      `Данные за ${days} дней:\n\n${JSON.stringify(full)}`, 2500, a => a.text.trim())
    body = r.value; model = r.model; tokensIn = r.answer.tokensIn; tokensOut = r.answer.tokensOut
  }

  const { data: saved, error: saveErr } = await admin.from('feedback_digests')
    .insert({ period_days: days, model, body, stats: full, tokens_in: tokensIn, tokens_out: tokensOut })
    .select('id, created_at').single()
  if (saveErr) throw new Error(`сводка не сохранилась: ${saveErr.message}`)
  const telegram = items > 0 ? await sendToTelegram(body) : false
  return { id: saved.id, created_at: saved.created_at, model, body, telegram }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const aiKey = Deno.env.get('AI_API_KEY') ?? Deno.env.get('KIE_API_KEY')
  const cronSecret = Deno.env.get('DIGEST_SECRET')
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const secret = req.headers.get('x-digest-secret')
  if (!(cronSecret && secret && secret === cronSecret)) {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Не авторизован' }, 401)
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: userData } = await caller.auth.getUser()
    if (!userData?.user) return json({ error: 'Не авторизован' }, 401)
    const { data: authUser } = await admin.auth.admin.getUserById(userData.user.id)
    const appRole = (authUser?.user?.app_metadata as { role?: string } | undefined)?.role
    if (appRole !== 'admin') return json({ error: 'Только для админа' }, 403)
  }

  const { data: flags } = await admin
    .from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_feedback_triage'])
  const off = ['ai_enabled', 'ai_feedback_triage'].filter(k => !flags?.find(f => f.key === k)?.enabled)
  if (off.length) return json({ error: `Сортировка выключена в админке (${off.join(', ')})` }, 409)
  if (!aiKey) return json({ error: 'AI_API_KEY не задан в секретах функции' }, 500)

  let mode = 'classify', days = 7
  try {
    const b = await req.json()
    if (b?.mode === 'digest') mode = 'digest'
    if (b?.days) days = Math.min(60, Math.max(1, Number(b.days) || 7))
  } catch { /* тело необязательно */ }

  try {
    return json(mode === 'digest' ? await digest(admin, aiKey, days) : await classify(admin, aiKey))
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

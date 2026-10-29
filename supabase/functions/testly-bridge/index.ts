// Edge Function: модуль «Тестли» в кабинете учителя.
//
// Тестли — отдельный продукт со своей базой. Учитель берёт там код («Подключить
// к Искре»), вводит его в Профиль → Модули, и эта функция меняет код на ключ у
// функции iskra в Тестли. Ключ хранится в teacher_module_secrets и наружу не
// отдаётся: браузер учителя видит только строку teacher_modules и список тестов.
//
// Request (JWT учителя в Authorization):
//   { action: 'connect', code }  → { email, tests }
//   { action: 'tests' }          → { tests: TestlyTest[] }
//   { action: 'disconnect' }     → { ok }
//   { action: 'results', items: [{ testId, studentId }] } → { items }   балл учеников этого учителя (studentId — students.id)
//
// Ученик (JWT ученика) — тест из Тестли в своей домашке:
//   { action: 'start', testId, owner? }  → { path, status }  личная ссылка /t/<id>?i=<token>
//   { action: 'status', testId, owner? } → статус попытки и балл (что показывать — как в Тестли)
// owner — учитель, поставивший тест (TestlyRef.owner); без него ищем среди учителей ученика.
// key ученика в Тестли — 'iskra:<auth id ученика>'.
//
// Секреты функции: TESTLY_URL (https://<проект>.supabase.co) и
// TESTLY_ISKRA_SECRET — тот же, что ISKRA_BRIDGE_SECRET у функции iskra в Тестли.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

const TESTLY_URL = Deno.env.get('TESTLY_URL') ?? ''
const TESTLY_SECRET = Deno.env.get('TESTLY_ISKRA_SECRET') ?? ''

/** Запрос к функции iskra в Тестли. Ошибку Тестли отдаём кодом, текст — на клиенте. */
async function testly(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${TESTLY_URL}/functions/v1/iskra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-iskra-secret': TESTLY_SECRET },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (!TESTLY_URL || !TESTLY_SECRET) return json({ error: 'not_configured' }, 503)

  const url = Deno.env.get('SUPABASE_URL')!
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'auth' }, 401)
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'auth' }, 401)
  const teacher = userData.user.id
  // Тестли показывает учителю, к какому аккаунту Искры он подключён.
  const iskraEmail = userData.user.email ?? ''
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }

  const tokenOf = async () => {
    const { data } = await admin.from('teacher_module_secrets').select('token')
      .eq('teacher_id', teacher).eq('module', 'testly').maybeSingle()
    return (data?.token as string | undefined) ?? null
  }

  /** Учителя ученика с подключённым Тестли: владелец задания первым, если он среди них. */
  const ownersOfStudent = async (owner: unknown) => {
    const { data: rows } = await admin.from('students').select('name, group_id').eq('auth_user_id', teacher)
    const groups = [...new Set((rows ?? []).map(r => r.group_id).filter(Boolean))]
    if (!groups.length) return { name: '', owners: [] as string[] }
    const { data: gs } = await admin.from('groups').select('created_by').in('id', groups)
    const all = [...new Set((gs ?? []).map(g => g.created_by as string).filter(Boolean))]
    const owners = typeof owner === 'string' && all.includes(owner) ? [owner] : all
    return { name: String(rows?.[0]?.name ?? ''), owners }
  }
  const tokenFor = async (owner: string) => {
    const { data } = await admin.from('teacher_module_secrets').select('token')
      .eq('teacher_id', owner).eq('module', 'testly').maybeSingle()
    return (data?.token as string | undefined) ?? null
  }
  /** Ученику — то, что Тестли разрешает показать после сдачи (настройка «что показывать»). */
  const forStudent = (x: Record<string, unknown>) => {
    const show = x.showAfter
    return {
      state: x.state, total: x.total, answered: x.answered, startedAt: x.startedAt, submittedAt: x.submittedAt,
      ...(show !== 'none' && x.state === 'submitted' ? { got: x.got, max: x.max, pending: x.pending } : {}),
      ...(show === 'review' && x.state === 'submitted' ? { review: x.review } : {}),
    }
  }
  const studentKey = `iskra:${teacher}`

  try {
    switch (body.action) {
      case 'start':
      case 'status': {
        const { name, owners } = await ownersOfStudent(body.owner)
        if (!owners.length) return json({ error: 'not_student' }, 403)
        // Тест ищем у владельца задания; у старых заданий его нет — пробуем учителей ученика по очереди.
        for (const owner of owners) {
          const token = await tokenFor(owner)
          if (!token) continue
          if (body.action === 'start') {
            const r = await testly({ action: 'invite', token, testId: String(body.testId ?? ''), key: studentKey, name })
            if (r.status === 404 || r.status === 401) continue
            if (!r.ok) return json({ error: 'testly' }, 502)
            return json({ path: r.data.path, status: r.data.status })
          }
          const r = await testly({ action: 'status', token, items: [{ testId: String(body.testId ?? ''), key: studentKey }] })
          if (!r.ok) continue
          const it = (r.data.items as Record<string, unknown>[] | undefined)?.[0]
          if (!it || it.state === 'gone') continue
          return json(forStudent(it))
        }
        return json({ error: 'not_connected' }, 409)
      }
      case 'results': {
        const token = await tokenOf()
        if (!token) return json({ error: 'not_connected' }, 409)
        const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100) as { testId?: unknown; studentId?: unknown }[]
        // Только ученики групп этого учителя: чужой балл по id не отдаём.
        const ids = [...new Set(items.map(i => String(i?.studentId ?? '')).filter(x => /^[0-9a-f-]{36}$/i.test(x)))]
        const { data: groups } = await admin.from('groups').select('id').eq('created_by', teacher)
        const { data: mine } = ids.length && groups?.length
          ? await admin.from('students').select('id, auth_user_id').in('id', ids).in('group_id', groups.map(g => g.id))
          : { data: [] as { id: string; auth_user_id: string | null }[] }
        const keyOf = new Map((mine ?? []).filter(r => r.auth_user_id).map(r => [r.id as string, `iskra:${r.auth_user_id}`]))
        const asked = items.filter(i => keyOf.has(String(i?.studentId ?? '')))
          .map(i => ({ testId: String(i.testId ?? ''), studentId: String(i.studentId), key: keyOf.get(String(i.studentId))! }))
        if (!asked.length) return json({ items: [] })
        const r = await testly({ action: 'status', token, items: asked.map(({ testId, key }) => ({ testId, key })) })
        if (r.status === 401) return json({ error: 'revoked' }, 409)
        if (!r.ok) return json({ error: 'testly' }, 502)
        const got = (r.data.items ?? []) as Record<string, unknown>[]
        return json({ items: got.map(x => ({ ...x, studentId: asked.find(a => a.testId === x.testId && a.key === x.key)?.studentId })) })
      }
      case 'connect': {
        const r = await testly({ action: 'exchange', code: String(body.code ?? ''), iskraEmail })
        if (!r.ok) return json({ error: r.data.error === 'bad_code' ? 'bad_code' : 'testly' }, r.status === 400 ? 400 : 502)
        const old = await tokenOf()
        const meta = { email: String(r.data.email ?? ''), tests: Number(r.data.tests ?? 0) }
        const { error: e1 } = await admin.from('teacher_modules').upsert({ teacher_id: teacher, module: 'testly', meta, connected_at: new Date().toISOString() })
        const { error: e2 } = e1 ? { error: e1 } : await admin.from('teacher_module_secrets').upsert({ teacher_id: teacher, module: 'testly', token: String(r.data.token) })
        if (e2) { console.error('[testly-bridge] save', e2); return json({ error: 'save' }, 500) }
        // Переподключение другим кодом: старый ключ в Тестли больше не нужен.
        if (old && old !== r.data.token) await testly({ action: 'revoke', token: old })
        return json(meta)
      }
      case 'tests': {
        const token = await tokenOf()
        if (!token) return json({ error: 'not_connected' }, 409)
        const r = await testly({ action: 'tests', token, iskraEmail })
        if (r.status === 401) return json({ error: 'revoked' }, 409)
        if (!r.ok) return json({ error: 'testly' }, 502)
        const tests = Array.isArray(r.data.tests) ? r.data.tests : []
        // Число тестов в карточке модуля держим свежим — без лишнего запроса из профиля.
        await admin.from('teacher_modules').update({ meta: { ...(await metaOf(admin, teacher)), tests: tests.length } })
          .eq('teacher_id', teacher).eq('module', 'testly')
        return json({ tests })
      }
      case 'disconnect': {
        const token = await tokenOf()
        if (token) await testly({ action: 'revoke', token })
        await admin.from('teacher_modules').delete().eq('teacher_id', teacher).eq('module', 'testly')
        return json({ ok: true })
      }
      default:
        return json({ error: 'bad_action' }, 400)
    }
  } catch (e) {
    console.error('[testly-bridge]', e)
    return json({ error: 'server' }, 500)
  }
})

async function metaOf(admin: ReturnType<typeof createClient>, teacher: string): Promise<Record<string, unknown>> {
  const { data } = await admin.from('teacher_modules').select('meta').eq('teacher_id', teacher).eq('module', 'testly').maybeSingle()
  return (data?.meta as Record<string, unknown>) ?? {}
}

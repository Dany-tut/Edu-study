// Edge Function: утренняя сводка учителя ХимБио → Таскли.
//
// Собирает сводку одним вызовом chembio_day_summary() (миграция 0104) и
// кладёт её в канал Таскли: PUT /chembio/day с заголовком X-ChemBio-Token.
// Формат канала — ChemBio_KB/integration/TASKLY.md, «Канал ХимБио».
// Канал хранит одну последнюю сводку, и её видит телефон Вадима.
//
// Запрос:  POST { teacher_id: uuid, date?: 'ГГГГ-ММ-ДД', sample?: boolean, dry_run?: boolean }
//   — только от cron: заголовок x-chembio-secret со значением CHEMBIO_CRON_SECRET;
//   — dry_run: вернуть сводку, в Таскли не слать;
//   — sample: пометить сводку "sample": true (Таскли рисует метку «ПРИМЕР»).
// Ответ:   { summary, taskly?: { status, body } }
//
// Секреты: CHEMBIO_TOKEN (тот же, что у Таскли на Railway), CHEMBIO_CRON_SECRET
// (тот же, что в Vault под именем chembio_cron_secret), CHEMBIO_URL — адрес
// канала, по умолчанию боевой Таскли.
//
// verify_jwt выключен: cron ходит без пользовательского токена. Своя проверка
// ниже пускает только его.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const TASKLY_URL = Deno.env.get('CHEMBIO_URL') ??
  'https://taskly-api-production-9469.up.railway.app/chembio/day'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const cronSecret = Deno.env.get('CHEMBIO_CRON_SECRET')
  if (!cronSecret || req.headers.get('x-chembio-secret') !== cronSecret) {
    return json({ error: 'forbidden' }, 403)
  }

  const body = await req.json().catch(() => ({}))
  const teacherId = typeof body.teacher_id === 'string' ? body.teacher_id : ''
  if (!/^[0-9a-f-]{36}$/i.test(teacherId)) return json({ error: 'teacher_id required' }, 400)
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : undefined

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const { data: summary, error } = await admin.rpc('chembio_day_summary', {
    p_teacher: teacherId,
    ...(date ? { p_date: date } : {}),
  })
  if (error || !summary) return json({ error: error?.message ?? 'empty summary' }, 500)
  if (body.sample === true) summary.sample = true

  if (body.dry_run === true) return json({ summary })

  const token = Deno.env.get('CHEMBIO_TOKEN')
  if (!token) return json({ error: 'CHEMBIO_TOKEN not set', summary }, 500)

  const res = await fetch(TASKLY_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-ChemBio-Token': token },
    body: JSON.stringify(summary),
  })
  const text = await res.text()
  if (!res.ok) console.error('chembio-day: Таскли ответил', res.status, text)
  return json({ summary, taskly: { status: res.status, body: text } }, res.ok ? 200 : 502)
})

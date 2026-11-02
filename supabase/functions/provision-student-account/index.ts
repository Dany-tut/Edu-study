// Issue a synthetic-login account and return its random credential once.
// Never read or persist plaintext passwords in public tables.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

/** Читаемый пароль — та же семья, что у reset-student-password. */
function genPassword() {
  return crypto.randomUUID().replace(/-/g, '')
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

/**
 * Логин из имени: «Иван Петров» → `ivan-petrov`.
 *
 * Хвост из id добавляется всегда, а не только при совпадении: два Ивана
 * Петрова у разных преподавателей — обычное дело, а ловить коллизию постфактум
 * дороже, чем сразу сделать логин уникальным.
 */
function loginFromName(name: string, id: string): string {
  const slug = [...name.toLowerCase()]
    .map(ch => TRANSLIT[ch] ?? (/[a-z0-9]/.test(ch) ? ch : ' '))
    .join('')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 24)
  return `${slug || 'uchenik'}-${id.slice(0, 4)}@uchenik.iskra`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Не авторизован' }, 401)

  // 1) Кто зовёт.
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Не авторизован' }, 401)
  const callerId = userData.user.id
  const isAdmin = (userData.user.app_metadata as { role?: string } | null)?.role === 'admin'

  let studentId = ''
  let all = false
  try {
    const body = await req.json()
    studentId = String(body.studentId ?? '')
    all = body.all === true
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  if (!studentId && !all) return json({ error: 'Не указан ученик' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 2) Кого заводим. Всегда только СВОИХ: выборка идёт через students.created_by,
  //    поэтому даже с `all: true` чужие ученики сюда не попадают.
  let q = admin
    .from('students')
    .select('id, name, email, person_id, group_id, auth_user_id, created_by')
    .is('auth_user_id', null)
  if (studentId) q = q.eq('id', studentId)
  if (!isAdmin) q = q.eq('created_by', callerId)

  const { data: rows, error: listErr } = await q
  if (listErr) return json({ error: 'Не удалось прочитать учеников: ' + listErr.message }, 500)
  if (!rows || rows.length === 0) return json({ accounts: [] })

  // 3) Одна карточка на человека: у 1:1-ученика их несколько (по предмету), а
  //    аккаунт нужен один — остальные подшиваются к нему по person_id.
  const byPerson = new Map<string, typeof rows[number]>()
  for (const r of rows) {
    const key = (r.person_id as string | null) ?? (r.id as string)
    if (!byPerson.has(key)) byPerson.set(key, r)
  }

  const accounts: Array<Record<string, unknown>> = []
  for (const s of byPerson.values()) {
    const id = s.id as string
    const name = (s.name as string) ?? 'Ученик'
    // Своя почта и пароль сохраняются: у троих они есть, и вход после перевода
    // должен работать теми же самыми, что человек уже знает.
    const email = ((s.email as string | null) || '').trim() || loginFromName(name, id)
    const password = genPassword()

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', name },
    })

    if (createErr || !created?.user) {
      accounts.push({ studentId: id, name, email, status: 'error', error: createErr?.message ?? 'не создан' })
      continue
    }

    // 4) Привязать аккаунт ко ВСЕМ карточкам человека.
    const patch = { auth_user_id: created.user.id, email }
    const personId = s.person_id as string | null
    let linkQuery = admin.from('students').update(patch).is('auth_user_id', null)
    linkQuery = personId ? linkQuery.eq('person_id', personId) : linkQuery.eq('id', id)
    if (!isAdmin) linkQuery = linkQuery.eq('created_by', callerId)
    const { data: linked, error: linkErr } = await linkQuery.select('id')

    if (linkErr || !linked?.length) {
      // Аккаунт создан, а привязка не легла — убираем за собой, иначе почта
      // окажется занятой, а ученик так и останется легаси.
      await admin.auth.admin.deleteUser(created.user.id)
      accounts.push({ studentId: id, name, email, status: 'error', error: 'Не удалось связать аккаунт с карточкой' })
      continue
    }

    // 5) Прогресс по курсу — тем же способом, что и при обычной регистрации.
    //    Не критично: без него кабинет просто дособерёт его сам.
    try { await admin.rpc('seed_student_progress', { p_student_id: id, p_group_id: s.group_id }) } catch { /* не повод падать */ }

    accounts.push({ studentId: id, name, email, password, status: 'created' })
  }

  return json({ accounts })
})

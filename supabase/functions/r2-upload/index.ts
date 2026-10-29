// Edge Function: ссылка на загрузку большого файла урока в Cloudflare R2.
//
// ЗАЧЕМ. Бакет lesson-materials в Supabase принимает файл до 25 МБ (бесплатный
// план — не больше 50 МБ) и отдаёт 5 ГБ трафика в месяц: рабочая тетрадь из
// сканов на 200 МБ туда не влезает, а если бы влезла — 25 скачиваний съели бы
// весь месячный трафик платформы. У R2 бесплатно 10 ГБ места, а исходящий
// трафик не тарифицируется вовсе.
//
// КАК. Файл через функцию не идёт (у Edge Function потолок тела и времени):
// функция только подписывает PUT-ссылку на 1 час (S3 SigV4, query-подпись),
// браузер льёт файл прямо в R2, а читают его ученики по публичному адресу
// бакета (r2.dev или свой домен). Ключ объекта — `<uid>/<uuid>.<ext>`, как в
// lesson-materials.
//
// СЕКРЕТЫ (supabase secrets set …):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
//   R2_PUBLIC_URL  — публичный адрес бакета без слеша на конце
//   R2_MAX_MB      — необязательно, потолок файла (по умолчанию 500)
// Пока секретов нет, функция отвечает 503 `notConfigured` — клиент тогда
// показывает прежнюю ошибку «больше 25 МБ».
//
// Запрос:  POST { name, size, mime }  + JWT учителя
// Ответ:   { uploadUrl, publicUrl, key } | { error, notConfigured? }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Расширение из имени — тем же правилом, что extOf в lib/lessonFiles. */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
}

Deno.serve(async (req) => {
  try {
    return await handle(req)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const account   = Deno.env.get('R2_ACCOUNT_ID')
  const accessKey = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucket    = Deno.env.get('R2_BUCKET')
  const publicUrl = Deno.env.get('R2_PUBLIC_URL')?.replace(/\/+$/, '')
  if (!account || !accessKey || !secretKey || !bucket || !publicUrl) {
    return json({ error: 'Хранилище для больших файлов не подключено', notConfigured: true }, 503)
  }
  const maxBytes = Number(Deno.env.get('R2_MAX_MB') ?? 500) * 1024 * 1024

  // ── Кто зовёт ─────────────────────────────────────────────────────────────
  // Только учитель: у ученика profiles.role = 'student', файлы урока он не
  // прикрепляет, а чужая ссылка на функцию не должна превращаться в
  // бесплатный файлообменник.
  const url     = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Не авторизован' }, 401)
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await caller.auth.getUser()
  const uid = userData?.user?.id
  if (!uid) return json({ error: 'Не авторизован' }, 401)
  // Роль читаем сервисным ключом: не зависим от того, какие строки profiles
  // RLS отдаёт самому человеку.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', uid).maybeSingle()
  if (!profile || profile.role === 'student') return json({ error: 'Загружать файлы урока может только учитель' }, 403)

  let body: { name?: string; size?: number; mime?: string }
  try { body = await req.json() } catch { return json({ error: 'Пустой запрос' }, 400) }
  const size = Number(body.size) || 0
  if (size <= 0) return json({ error: 'Пустой файл' }, 400)
  if (size > maxBytes) {
    return json({ error: `Файл ${(size / 1024 / 1024).toFixed(0)} МБ — больше ${(maxBytes / 1024 / 1024).toFixed(0)} МБ` }, 413)
  }

  const key = `${uid}/${crypto.randomUUID()}.${extOf(String(body.name ?? ''))}`
  const r2 = new AwsClient({ accessKeyId: accessKey, secretAccessKey: secretKey, service: 's3', region: 'auto' })
  const target = new URL(`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`)
  target.searchParams.set('X-Amz-Expires', '3600')
  const signed = await r2.sign(new Request(target, { method: 'PUT' }), { aws: { signQuery: true } })

  return json({ uploadUrl: signed.url, publicUrl: `${publicUrl}/${key}`, key })
}

// Edge Function: подпись PUT-ссылки в R2 для службы автоимпорта записей.
//
// Служба iskra-media-sync на нашем VPS копирует ролик из папки Диска прямо в
// R2. Ключей R2 у неё нет — они лежат только в секретах Supabase. Функция
// подписывает одну PUT-ссылку на конкретный ключ `rec/…`; сам файл через
// Supabase не идёт (весь трафик — VPS → Cloudflare).
//
// Доступ: секрет службы в теле. Проверяем его той же функцией БД, что и все
// вызовы службы (media_sync.check_secret внутри media_sync_sources_due).
//
// Запрос:  POST { secret, key, size }   (verify_jwt = false — своя проверка)
// Ответ:   { uploadUrl, publicUrl, key } | { error }
// Проект: design/recordings-import/README.md

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const KEY_RE = /^rec\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,80}-[A-Za-z0-9_-]{4,16}\.(mp4|m4v|mov|webm)$/
const MAX_BYTES = 5 * 1024 * 1024 * 1024 - 1 // предел одного PUT в R2

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  let body: { secret?: string; key?: string; size?: number }
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const secret = String(body.secret ?? '')
  const key = String(body.key ?? '')
  const size = Number(body.size) || 0
  if (!KEY_RE.test(key)) return json({ error: 'bad key' }, 400)
  if (size <= 0 || size > MAX_BYTES) return json({ error: 'bad size' }, 400)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
  const { error: authError } = await anon.rpc('media_sync_sources_due', {
    p_secret: secret, p_source_id: '00000000-0000-0000-0000-000000000000',
  })
  if (authError) return json({ error: 'forbidden' }, 403)

  const account = Deno.env.get('R2_ACCOUNT_ID')
  const accessKey = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const bucket = Deno.env.get('R2_BUCKET')
  const publicUrl = Deno.env.get('R2_PUBLIC_URL')?.replace(/\/+$/, '')
  if (!account || !accessKey || !secretKey || !bucket || !publicUrl) return json({ error: 'R2 not configured' }, 503)

  const r2 = new AwsClient({ accessKeyId: accessKey, secretAccessKey: secretKey, service: 's3', region: 'auto' })
  const target = new URL(`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`)
  // Подпись проверяется в начале запроса: 6 часов хватает на очередь и 5 ГБ.
  target.searchParams.set('X-Amz-Expires', '21600')
  const signed = await r2.sign(new Request(target, { method: 'PUT' }), { aws: { signQuery: true } })
  return json({ uploadUrl: signed.url, publicUrl: `${publicUrl}/${key}`, key })
})

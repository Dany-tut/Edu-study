// Edge Function: удаляет фото сдач ДЗ старше 7 дней (бакет homework-photos).
//
// Зовёт её pg_cron раз в сутки (run_homework_photos_cleanup).
// Список просроченных путей отдаёт RPC homework_photos_expired() — она видна
// только service_role. Удаляем через Storage API: прямой DELETE из
// storage.objects Supabase запрещает, и он оставил бы сам файл в S3.
//
// В lesson_progress ничего не правим: ссылка `hwp:<путь>` остаётся, интерфейс
// по дате в имени файла понимает, что фото уже удалено, и рисует заглушку.
// Балл, разбор и комментарии учителя не трогаются.
//
// Запрос:  POST {} с заголовком x-cleanup-secret = HW_PHOTOS_CLEANUP_SECRET.
// Ответ:   { removed: number }
//
// verify_jwt выключен (cron ходит без пользовательского токена) — пускаем
// только по секрету.

import { createClient } from 'jsr:@supabase/supabase-js@2.118.0'

const BUCKET = 'homework-photos'
// Предохранитель: за один вызов не больше 20 пачек по 1000.
const MAX_BATCHES = 20

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const cronSecret = Deno.env.get('HW_PHOTOS_CLEANUP_SECRET')
  const secret = req.headers.get('x-cleanup-secret')
  if (!cronSecret || secret !== cronSecret) return json({ error: 'forbidden' }, 403)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  let removed = 0
  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data, error } = await admin.rpc('homework_photos_expired', { p_limit: 1000 })
    if (error) return json({ error: error.message, removed }, 500)
    const names = (data ?? []) as string[]
    if (!names.length) break
    const { data: gone, error: rmErr } = await admin.storage.from(BUCKET).remove(names)
    if (rmErr) return json({ error: rmErr.message, removed }, 500)
    removed += gone?.length ?? 0
    // Ничего не удалилось — не крутимся впустую на тех же именах.
    if (!gone?.length) break
  }
  console.log(`[homework-photos-cleanup] removed ${removed}`)
  return json({ removed })
})

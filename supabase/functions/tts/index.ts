// Edge Function: озвучка с сервера — запасной голос для устройств, где синтез
// речи в браузере молчит.
//
// ЗАЧЕМ. На части айфонов Web Speech проходит фразу целиком (onstart →
// onboundary → onend, ошибок нет), а из динамика тишина — любым голосом, даже
// на голой странице без кода приложения. Медиаэлемент на тех же телефонах
// звучит. Поэтому фраза синтезируется здесь, а играет её <audio> (lib/speech.ts).
//
// ПОЧЕМУ GET И БЕЗ JWT. Адрес ставится прямо в audio.src — внутри жеста
// пользователя, без await: на iOS любой await до play() и звука не будет. А
// медиаэлемент заголовков не шлёт. Расход закрывают другие замки: рубильник
// `ai_tts` (+ общий `ai_enabled`), дневной потолок знаков, длина фразы и белый
// список языков и голосов.
//
// КЭШ. Готовое mp3 лежит в публичном бакете `tts` по хешу «голос | скорость |
// текст». Фразы наборов одинаковые у всех учеников — платим за фразу один раз.
// Отдаём всегда редиректом на файл в хранилище, а не телом ответа: Safari
// играет медиа только с сервера, который понимает Range-запросы, а хранилище
// их понимает.
//
// Запрос:  GET ?l=<локаль>&v=<номер голоса>&r=<скорость>&t=<текст>
// Ответ:   302 на mp3 | 4xx/5xx JSON с ошибкой (audio получит onerror)
//
// Провайдер — Google Cloud TTS, голоса Chirp 3 HD: живые, есть на en/ko/ja/pt/ru,
// первый миллион знаков в месяц бесплатно. Ключ — GOOGLE_TTS_KEY в секретах.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Локаль приложения → код языка у Google. Чего нет в списке, не синтезируем. */
const LOCALES: Record<string, string> = {
  'en-US': 'en-US', 'en-GB': 'en-GB', 'ru-RU': 'ru-RU', 'ko-KR': 'ko-KR',
  'ja-JP': 'ja-JP', 'pt-BR': 'pt-BR', 'es-ES': 'es-ES', 'fr-FR': 'fr-FR',
  'de-DE': 'de-DE', 'it-IT': 'it-IT', 'tr-TR': 'tr-TR', 'zh-CN': 'cmn-CN',
}

// Дикторы Chirp 3 HD одни на все языки. Чередуем женский и мужской: номер
// голоса клиент берёт от сцены (урок, домашка), и соседние занятия звучат
// разными людьми — как и на браузерном автовыборе.
const VOICES = (Deno.env.get('TTS_VOICES') ?? 'Kore,Charon,Aoede,Puck')
  .split(',').map(v => v.trim()).filter(Boolean)

/** Длиннее не бывает: speech.ts режет текст на реплики до 180 знаков. */
const MAX_TEXT = 300

const DAILY_CHARS = Number(Deno.env.get('TTS_DAILY_CHARS') ?? 100000)

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

async function synthesize(key: string, lang: string, voice: string, rate: number, text: string): Promise<Uint8Array> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang, name: `${lang}-Chirp3-HD-${voice}` },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
    }),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}: ${raw.slice(0, 300)}`)
  const body = JSON.parse(raw) as { audioContent?: string }
  if (!body.audioContent) throw new Error('Google TTS вернул пустой ответ')
  return Uint8Array.from(atob(body.audioContent), c => c.charCodeAt(0))
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
  if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)

  const q = new URL(req.url).searchParams
  const locale = q.get('l') ?? ''
  const lang = LOCALES[locale]
  if (!lang) return json({ error: `Язык не поддерживается: ${locale}` }, 400)
  const text = (q.get('t') ?? '').trim()
  if (!text) return json({ error: 'Нечего читать' }, 400)
  if (text.length > MAX_TEXT) return json({ error: 'Слишком длинная фраза' }, 413)
  const voice = VOICES[Math.abs(Math.floor(Number(q.get('v')) || 0)) % VOICES.length]
  // Скорость шагом 0.05: иначе 0.8 и 0.8000001 — два платных файла.
  const rate = Math.min(1.5, Math.max(0.5, Math.round((Number(q.get('r')) || 1) * 20) / 20))

  const url        = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const hash = await sha256(`${voice}|${rate}|${text}`)
  const dir = locale
  const name = `${hash}.mp3`
  const path = `${dir}/${name}`
  const publicUrl = `${url}/storage/v1/object/public/tts/${path}`
  // Ссылка на файл не меняется никогда (адрес = хеш содержимого), поэтому и
  // редирект можно кэшировать надолго: повторный тап идёт мимо функции.
  const redirect = () => new Response(null, {
    status: 302,
    headers: { ...cors, Location: publicUrl, 'Cache-Control': 'public, max-age=31536000, immutable' },
  })

  const { data: found } = await admin.storage.from('tts').list(dir, { search: name, limit: 1 })
  if (found?.some(f => f.name === name)) return redirect()

  // Дальше — новый синтез, то есть деньги.
  const { data: flags } = await admin
    .from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_tts'])
  const off = ['ai_enabled', 'ai_tts'].filter(k => !flags?.find(f => f.key === k)?.enabled)
  if (off.length) return json({ error: `Озвучка с сервера выключена в админке (${off.join(', ')})` }, 409)
  const key = Deno.env.get('GOOGLE_TTS_KEY')
  if (!key) return json({ error: 'GOOGLE_TTS_KEY не задан в секретах функции' }, 500)

  const { data: spent, error: spendErr } = await admin.rpc('tts_spend_add', { n: text.length })
  if (spendErr) throw new Error(`счёт знаков: ${spendErr.message}`)
  if (Number(spent) > DAILY_CHARS) return json({ error: 'Дневной лимит озвучки исчерпан' }, 429)

  const audio = await synthesize(key, lang, voice, rate, text)
  const { error: upErr } = await admin.storage.from('tts').upload(path, audio, {
    contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true,
  })
  if (upErr) throw new Error(`хранилище: ${upErr.message}`)
  return redirect()
}

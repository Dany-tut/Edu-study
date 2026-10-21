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
// ПРОВАЙДЕР. По умолчанию — ElevenLabs Multilingual v2 через шлюз kie.ai: ключ
// шлюза (AI_API_KEY) у проекта уже есть и оплачен, отдельная карта не нужна, а
// модель одна на en/ko/ja/pt/ru. Задача у шлюза асинхронная (createTask →
// опрос recordInfo), поэтому первый синтез фразы занимает несколько секунд;
// дальше она берётся из кэша. Если в секретах есть GOOGLE_TTS_KEY — синтез идёт
// через Google Cloud TTS (Chirp 3 HD): быстрее и дешевле, но там нужна карта.
// Основной недоступен (нет ключа, кончились деньги) — читает запасной: озвучка
// Google Translate без ключа (см. synthesizeFree).

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

// Дикторы одни на все языки. Чередуем женский и мужской: номер голоса клиент
// берёт от сцены (урок, домашка), и соседние занятия звучат разными людьми —
// как и на браузерном автовыборе. Номер общий, имена у провайдеров свои.
const GOOGLE_VOICES = ['Kore', 'Charon', 'Aoede', 'Puck']
// ElevenLabs: Adeline, Mark, Eve, James — из списка голосов шлюза kie.ai.
const ELEVEN_VOICES = (Deno.env.get('TTS_VOICES') ??
  '5l5f8iK3YPeGga21rQIX,1SM7GgM6IMuvQlz2BwM3,BZgkqPqms7Kj9ulSkVzn,EkK5I93UQWFDigLMpZcX')
  .split(',').map(v => v.trim()).filter(Boolean)

const KIE_URL = 'https://api.kie.ai/api/v1/jobs'
const KIE_MODEL = Deno.env.get('TTS_KIE_MODEL') ?? 'elevenlabs/text-to-speech-multilingual-v2'

/** Сколько ждём шлюз: дольше медиаэлемент на айфоне всё равно не ждёт. */
const KIE_TIMEOUT = 40000

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

async function synthesizeKie(key: string, voice: string, rate: number, text: string): Promise<Uint8Array> {
  const auth = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
  const res = await fetch(`${KIE_URL}/createTask`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      model: KIE_MODEL,
      input: { text, voice, speed: Math.min(1.2, Math.max(0.7, rate)) },
    }),
  })
  const created = await res.json() as { code?: number; msg?: string; data?: { taskId?: string } }
  const taskId = created.data?.taskId
  if (created.code !== 200 || !taskId) throw new Error(`kie.ai createTask: ${created.code} ${created.msg ?? ''}`)

  const until = Date.now() + KIE_TIMEOUT
  for (let wait = 700; Date.now() < until; wait = Math.min(2000, wait + 300)) {
    await new Promise(r => setTimeout(r, wait))
    const info = await (await fetch(`${KIE_URL}/recordInfo?taskId=${taskId}`, { headers: auth })).json() as {
      code?: number; msg?: string
      data?: { state?: string; resultJson?: string; failMsg?: string; creditsConsumed?: number }
    }
    const d = info.data
    if (!d || d.state === 'waiting' || d.state === 'queuing' || d.state === 'generating') continue
    if (d.state === 'fail') throw new Error(`kie.ai: ${d.failMsg ?? 'синтез не удался'}`)
    if (d.state === 'success') {
      const url = (JSON.parse(d.resultJson ?? '{}') as { resultUrls?: string[] }).resultUrls?.[0]
      if (!url) throw new Error('kie.ai вернул задачу без файла')
      console.log(`tts kie ${text.length} знаков, кредитов ${d.creditsConsumed}`)
      // Ссылка шлюза временная — забираем файл себе в кэш.
      const audio = await fetch(url)
      if (!audio.ok) throw new Error(`kie.ai файл HTTP ${audio.status}`)
      return new Uint8Array(await audio.arrayBuffer())
    }
  }
  throw new Error('kie.ai не успел синтезировать фразу')
}

/** Пока шлюз kie.ai отказывает (нет денег), сюда пишется, до какого момента
 *  его не трогать. Живёт в памяти воркера — после перезапуска одна проба. */
let kieDownUntil = 0
const KIE_RETRY = 10 * 60 * 1000

/** Языки Google Translate: у него свои коды, бразильского отдельно нет. */
const FREE_LANG: Record<string, string> = { 'cmn-CN': 'zh-CN', 'pt-BR': 'pt' }

/**
 * ЗАПАСНОЙ ГОЛОС — озвучка Google Translate без ключа и без карты.
 *
 * Это неофициальный адрес (тот, что звучит у кнопки «Прослушать» в
 * переводчике): Google вправе ограничить его в любой момент, голос один на
 * язык и проще нейросетевых. Поэтому он только подстраховка: работает, пока
 * основной провайдер недоступен, а записанное им лежит под своим ключом кэша.
 */
async function synthesizeFree(lang: string, rate: number, text: string): Promise<Uint8Array> {
  const tl = FREE_LANG[lang] ?? lang.split('-')[0]
  const q = new URLSearchParams({
    ie: 'UTF-8', client: 'tw-ob', tl, q: text,
    // У переводчика две скорости: обычная и «медленно».
    ttsspeed: rate < 0.9 ? '0.5' : '1',
  })
  const res = await fetch(`https://translate.google.com/translate_tts?${q}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://translate.google.com/' },
  })
  if (!res.ok) throw new Error(`Google Translate TTS HTTP ${res.status}`)
  if (!(res.headers.get('content-type') ?? '').includes('audio')) throw new Error('Google Translate TTS вернул не звук')
  return new Uint8Array(await res.arrayBuffer())
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
  const googleKey = Deno.env.get('GOOGLE_TTS_KEY')
  // KIE_API_KEY первым: AI_API_KEY с 22.09.2026 может смотреть на другой шлюз (AI_BASE_URL).
  const kieKey = Deno.env.get('KIE_API_KEY') ?? Deno.env.get('AI_API_KEY')
  const voices = googleKey ? GOOGLE_VOICES : ELEVEN_VOICES
  const voice = voices[Math.abs(Math.floor(Number(q.get('v')) || 0)) % voices.length]
  // Скорость шагом 0.05: иначе 0.8 и 0.8000001 — два платных файла.
  const rate = Math.min(1.5, Math.max(0.5, Math.round((Number(q.get('r')) || 1) * 20) / 20))

  const url        = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Адрес файла = хеш «провайдер | голос | скорость | текст». Провайдер в
  // ключе нарочно: фраза, прочитанная запасным голосом, не должна навсегда
  // занять место той, что прочитал бы основной, — после пополнения kie.ai
  // новые обращения получат голос ElevenLabs.
  const main = googleKey ? 'google' : 'kie'
  const fileOf = async (provider: string, v: string) => {
    const name = `${await sha256(`${provider}|${v}|${rate}|${text}`)}.mp3`
    return { name, path: `${locale}/${name}` }
  }
  const mainFile = await fileOf(main, voice)
  const freeFile = await fileOf('gtx', lang)
  // Ссылка на файл не меняется никогда (адрес = хеш содержимого), поэтому и
  // редирект можно кэшировать надолго: повторный тап идёт мимо функции.
  const redirect = (path: string) => new Response(null, {
    status: 302,
    headers: {
      ...cors,
      Location: `${url}/storage/v1/object/public/tts/${path}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })

  for (const f of [mainFile, freeFile]) {
    const { data } = await admin.storage.from('tts').list(locale, { search: f.name, limit: 1 })
    if (data?.some(x => x.name === f.name)) return redirect(f.path)
  }

  // Дальше — новый синтез.
  const { data: flags } = await admin
    .from('app_flags').select('key, enabled').in('key', ['ai_enabled', 'ai_tts'])
  const off = ['ai_enabled', 'ai_tts'].filter(k => !flags?.find(f => f.key === k)?.enabled)
  if (off.length) return json({ error: `Озвучка с сервера выключена в админке (${off.join(', ')})` }, 409)

  const save = async (path: string, audio: Uint8Array) => {
    const { error } = await admin.storage.from('tts').upload(path, audio, {
      contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true,
    })
    if (error) throw new Error(`хранилище: ${error.message}`)
    return redirect(path)
  }

  // Платный провайдер — если есть ключ и шлюз недавно не отказывал.
  if (googleKey || (kieKey && Date.now() > kieDownUntil)) {
    const { data: spent, error: spendErr } = await admin.rpc('tts_spend_add', { n: text.length })
    if (spendErr) throw new Error(`счёт знаков: ${spendErr.message}`)
    if (Number(spent) <= DAILY_CHARS) {
      try {
        const audio = googleKey
          ? await synthesize(googleKey, lang, voice, rate, text)
          : await synthesizeKie(kieKey!, voice, rate, text)
        return await save(mainFile.path, audio)
      } catch (e) {
        // Пустой баланс, сбой шлюза — читаем запасным голосом, а шлюз не
        // дёргаем десять минут: каждая неудача — лишние полторы секунды тишины.
        console.error('tts основной провайдер:', e instanceof Error ? e.message : e)
        if (!googleKey) kieDownUntil = Date.now() + KIE_RETRY
      }
    }
  }

  return await save(freeFile.path, await synthesizeFree(lang, rate, text))
}

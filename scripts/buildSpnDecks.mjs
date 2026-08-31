#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Сборка колод по сериям «Сверхъестественного» из субтитров
//
// ЗАЧЕМ. Редакторский набор (data/cardSeeds/supernatural.ts) отбирает лексику по
// памяти: что в сериале ярко, то и попадает. Это работает, но у памяти слепое
// пятно — она не знает, ЧТО ЧАСТО. Этот скрипт закрывает пятно счётом: читает
// субтитры, считает, что реально повторяется, и отдаёт кандидатов в карточки.
//
// СУБТИТРЫ В РЕПОЗИТОРИЙ НЕ ПОПАДАЮТ И НЕ ДОЛЖНЫ. Скрипт читает .srt с диска
// (--srt <папка>), а записывает только производную таблицу «слово — сколько
// серий — перевод». Это разные вещи и юридически, и по смыслу: список слов —
// факт о произведении, реплики — само произведение.
//
// ЧЕМУ НЕЛЬЗЯ ВЕРИТЬ В ИМЕНАХ ФАЙЛОВ. Проверено на живых архивах: в сезонном
// паке первого сезона НАЗВАНИЯ сдвинуты на серию (файл «1x02 - Pilot» содержит
// вторую серию), а в отдельных зипах с торрент-трекеров содержимое бывает
// вообще из другого сезона. Поэтому отсюда берётся ТОЛЬКО НОМЕР, а название
// подставляется из канонического списка ниже. И на всякий случай считается
// «отпечаток» серии: если в файле не находится ни одного слова, характерного
// для сериала, файл в сборку не идёт — скорее всего это чужое кино.
//
// ЧТО ОТБРАСЫВАЕТСЯ И ПОЧЕМУ (порядок важен, каждый фильтр ловит своё):
//   1. песни (строки с ♪) — это не речь, а текст песни, и учить его не надо;
//   2. пометки для глухих в скобках, теги <i>, тире реплик, «ИМЯ:» в начале;
//   3. мусор площадок субтитров — водяные знаки вида www / tvsubtitles / addic;
//   4. междометия (aaah, whew, hm) — пишутся кто во что горазд, словом не
//      являются;
//   5. стяжения и притяжательные (всё с апострофом) — им место в отдельной
//      колоде data/cardSeeds/spokenEn.ts, а «Dean's» вообще не слово;
//   6. имена собственные — по доле прописной буквы в корпусе: имя не переводят,
//      его узнают, и его место в справке по лору, а не в колоде;
//   7. слова, которые уже есть в готовых наборах, — второй раз учить нечего.
//
// ПОЧЕМУ ПОРОГ «В N СЕРИЯХ», А НЕ «N РАЗ ЗА СЕРИЮ». Две трети редкой лексики
// сериала встречается ровно в одной серии из ста четырёх: это монстр недели,
// который больше не вернётся. Карточка на такое слово — худшее вложение времени
// в этом проекте. Поэтому вес слова считается по числу СЕРИЙ, где оно звучит.
//
// ЗАПУСК
//   node scripts/buildSpnDecks.mjs --srt ~/srt --fake      # без сети, посмотреть отбор
//   node scripts/buildSpnDecks.mjs --srt ~/srt --write     # с переводами, записать файл
//   node scripts/buildSpnDecks.mjs --srt ~/srt --limit 40  # сколько слов за прогон
//
// КЛЮЧ. Берётся из ANTHROPIC_API_KEY, а если задан KIE_API_KEY — запрос уходит
// на шлюз kie.ai (там свой адрес и авторизация через Bearer вместо x-api-key).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name, def = null) => {
  const i = args.indexOf(name)
  return i >= 0 ? (args[i + 1] ?? true) : def
}
const FAKE = args.includes('--fake')
const WRITE = args.includes('--write')
/** `--via gpt` — обходной поставщик на случай, когда Claude-адаптер шлюза лежит. */
const VIA_GPT = String(flag('--via', 'claude')) === 'gpt'
const GPT_MODEL = String(flag('--gpt-model', 'gpt-5-6-sol'))
/** Слов в одном запросе. Больше сорока — ответ упирается в лимит вывода. */
const BATCH = Number(flag('--batch', 40))
const SRT_DIR = String(flag('--srt', '')).replace(/^~/, process.env.HOME ?? '')
const LIMIT = Number(flag('--limit', 60))
/**
 * В скольких сериях слово должно встретиться, чтобы попасть в колоду.
 *
 * ПОРОГ 2, А НЕ 5 — И ЭТО ПРИНЦИПИАЛЬНО. Задача колоды: выучить слова ПЕРЕД
 * КОНКРЕТНОЙ СЕРИЕЙ и понять её. Не «выучить ядро сериала»: у этих двух задач
 * разные ответы, и первый вариант скрипта отвечал на вторую.
 *
 * Замерено по 104 сериям, слов на серию после отсева имён и уже разобранного:
 *   всё выше B1  — 79,5 в среднем (медиана 78) — неподъёмно;
 *   ≥2 серий     — 24,1 (медиана 20) — то, что нужно;
 *   ≥3 серий     — 10,6 (медиана 9);
 *   ≥5 серий     — 3,0 (медиана 1) — ядро сериала, но серию оно не открывает.
 *
 * Единица «≥2» означает «слово вернётся хотя бы ещё раз»: одноразовую лексику
 * монстра недели (68% всей редкой) она по-прежнему отсекает.
 */
const MIN_EPISODES = Number(flag('--min', 2))
/**
 * Потолок карточек на серию. Двадцать — это медиана полосы ≥2, то есть в
 * половине серий потолок вообще не срабатывает, а в тяжёлых (до 86 слов) режет
 * хвост по весу. Колода перед серией должна быть предсказуемой по объёму.
 */
const CAP = Number(flag('--cap', 20))

if (!SRT_DIR || !existsSync(SRT_DIR)) {
  console.error('Укажи папку с субтитрами: --srt <путь>\nСубтитры не коммитятся — скрипт читает их с диска.')
  process.exit(1)
}

// ─── Канонические названия серий ─────────────────────────────────────────────
//
// Только первые пять сезонов: дальше субтитров пока не считали, а придумывать
// названия нельзя — ученик поверит подписи и полезет проверять.

const TITLES = {
  1: ['Pilot', 'Wendigo', 'Dead in the Water', 'Phantom Traveler', 'Bloody Mary', 'Skin', 'Hook Man', 'Bugs', 'Home', 'Asylum', 'Scarecrow', 'Faith', 'Route 666', 'Nightmare', 'The Benders', 'Shadow', 'Hell House', 'Something Wicked', 'Provenance', "Dead Man's Blood", 'Salvation', "Devil's Trap"],
}

// ─── Частотный список ────────────────────────────────────────────────────────
//
// Корпус субтитров (OpenSubtitles), а не книжный: у книжного наверху стоят
// «правительство» и «общество», которых в сериале про дорогу нет вовсе, и
// уровень считался бы не по тому языку. Файл кэшируется — он не меняется.

const CACHE = join(root, 'node_modules/.cache')
const FREQ_FILE = join(CACHE, 'en_50k.txt')
const FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt'

async function loadFreq() {
  if (!existsSync(FREQ_FILE)) {
    mkdirSync(CACHE, { recursive: true })
    process.stdout.write('качаю частотный список… ')
    const res = await fetch(FREQ_URL)
    if (!res.ok) throw new Error(`частотный список не скачался: ${res.status}`)
    writeFileSync(FREQ_FILE, await res.text())
    console.log('готово')
  }
  const rank = new Map()
  readFileSync(FREQ_FILE, 'utf8').trim().split('\n').forEach((l, i) => {
    const w = l.split(' ')[0]
    if (!rank.has(w)) rank.set(w, i + 1)
  })
  return rank
}

// ─── Разбор .srt ─────────────────────────────────────────────────────────────

// Водяные знаки площадок субтитров и пометки релизов. Список пополняется по
// факту: каждое такое «слово» иначе всплывает в кандидатах с частотой 100%,
// потому что стоит в каждом файле. Сюда же — «supernatural»: в субтитрах это
// заставка, а не произнесённое слово, и подпись «в 12 сериях» врала бы.
const JUNK = new Set('www com net org subtitle subtitles tvsubtitles opensubtitles sync corrected elderman hdtv xvid xor nbs dvdrip yyets addic addicted encoded ripped proper repack aac supernatural'.split(' '))
const INTERJ = /^(a{2,}h?|o+h+|u+h+|e+h+|hm+|mm+|wh?ew|ugh|argh|gah|huh|hey+|yay|woo+|shh+|psst|geez|jeez|whoa|aw+)$/

/** Только произнесённое: без песен, ремарок для глухих, тегов и имён говорящих. */
function speechOf(raw) {
  return raw.replace(/\r/g, '').split('\n').map(l => l.trim())
    .filter(t => t && !/^\d+$/.test(t) && !/-->/.test(t) && !/[♪♫]/.test(t))
    .map(s => s
      .replace(/<[^>]+>/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/^\s*[-–]\s*/, '')
      .replace(/^[A-Z][A-Z' .\-]{1,20}:\s*/, ''))
    .filter(s => s.trim()).join('\n')
}

/**
 * Отпечаток сериала. Файл, в котором не нашлось ничего из этого, почти наверняка
 * не «Сверхъестественное» — а имя файла, как мы выяснили, врёт спокойно.
 */
// Флаг g обязателен: без него String.match возвращает ПЕРВОЕ совпадение с
// группами захвата, длина такого массива всегда 2, и порог не набирается
// никогда — то есть отсеивались бы все серии подряд.
const FINGERPRINT = /\b(winchester|impala|dean|sammy|bobby|hunter|demon|ghost|salt)\b/gi
const fingerprintOk = text => (text.match(FINGERPRINT)?.length ?? 0) >= 5

// ─── Слова ───────────────────────────────────────────────────────────────────

const makeLemma = rank => w => {
  if (rank.has(w)) return w
  for (const [re, rep] of [[/ies$/, 'y'], [/ied$/, 'y'], [/es$/, ''], [/s$/, ''], [/ed$/, ''], [/ed$/, 'e'], [/ing$/, ''], [/ing$/, 'e']]) {
    if (re.test(w)) { const c = w.replace(re, rep); if (rank.has(c)) return c }
  }
  return w
}

/**
 * Слова, которые в тексте пишут с прописной, — имена и топонимы.
 *
 * ПОРОГ НИЗКИЙ, И ЭТО НЕ ОПЕЧАТКА. Интуитивно кажется, что имя должно быть с
 * прописной почти всегда, и первый вариант требовал 60%. По корпусу 104 серий
 * это пропускало имена насквозь: winchester 0,46 · bobby 0,49 · castiel 0,44 ·
 * impala 0,17 — реплика часто начинается с имени (тогда прописная не в счёт)
 * или набрана целиком капсом. А вот обратное верно железно: обычное слово в
 * середине предложения с прописной не пишут вовсе — psychic 0,02, journal 0,00,
 * motel 0,03, sulfur 0,00. Между 0,03 и 0,17 пропасть, граница проходит там.
 */
function properNames(texts) {
  const cap = new Map(), low = new Map()
  for (const t of texts) {
    for (const m of t.matchAll(/\b([A-Za-z][a-z']{2,})\b/g)) {
      const w = m[1].toLowerCase()
      const start = /[.!?"\n]\s*$|^$/.test(t.slice(Math.max(0, m.index - 2), m.index))
      if (/^[A-Z]/.test(m[1])) { if (!start) cap.set(w, (cap.get(w) ?? 0) + 1) }
      else low.set(w, (low.get(w) ?? 0) + 1)
    }
  }
  const out = new Set()
  for (const w of new Set([...cap.keys(), ...low.keys()])) {
    const c = cap.get(w) ?? 0, l = low.get(w) ?? 0
    if (c + l >= 3 && c / (c + l) > 0.1) out.add(w)
  }
  return out
}

/** Слова, уже разобранные в готовых наборах, — второй раз их учить нечего. */
function alreadyCovered() {
  const seen = new Set()
  const dir = join(root, 'src/data/cardSeeds')
  for (const f of readdirSync(dir).filter(f => f.endsWith('.ts'))) {
    const src = readFileSync(join(dir, f), 'utf8')
    for (const m of src.matchAll(/(?:term: |c\(\s*)'((?:[^'\\]|\\.)*)'/g)) {
      for (const w of m[1].replace(/\\'/g, "'").toLowerCase().split(/[^a-z'’]+/)) {
        if (w.length > 2) seen.add(w.replace(/[’']/g, "'"))
      }
    }
  }
  return seen
}

// ─── Перевод ─────────────────────────────────────────────────────────────────
//
// Слово переводится СО СТРОКОЙ, В КОТОРОЙ ОНО СТОИТ, но строка никуда не
// сохраняется — она нужна модели, чтобы выбрать значение, а не первое словарное.
// Без неё «shot» в сериале про охотников станет «броском», а «gank» вообще
// ничем. Пример же модель пишет СВОЙ: реплику сериала в карточку класть нельзя.

const SYSTEM = `Ты составляешь словарные карточки к сериалу «Сверхъестественное» для русскоязычного ученика уровня B1.
На каждое слово дай:
- ru: перевод тем словом, которое сказал бы русский. Не подстрочник. Если у слова в этом сериале особое значение — его и дай, пометив общее вторым через точку с запятой.
- note: одно-два предложения о том, что важно знать: ложный друг, ловушка произношения, ограничение употребления, разница с близким словом. Не пересказывай перевод.
- ex / exRu: ТВОЁ СОБСТВЕННОЕ короткое предложение в регистре сериала (дорога, мотель, охота) и его перевод.

СТРОКА ПОСЛЕ «в реплике:» ДАНА ТОЛЬКО ДЛЯ ТОГО, ЧТОБЫ ТЫ ПОНЯЛ ЗНАЧЕНИЕ СЛОВА.
Копировать её в ex запрещено — это чужой текст. Придумай другое предложение,
с другими словами и другой ситуацией.

Отвечай только JSON-массивом, по объекту на слово, в том же порядке.
Поле term повторяй ТОЧНО в том виде, в каком слово дано, — по нему идёт сверка.`

/** Вытащить готовый текст из SSE-потока Responses API. */
function textFromSSE(body) {
  // Финальный текст приходит одним событием response.output_text.done; собирать
  // его из дельт не надо, а брать первую попавшуюся строку "text" нельзя —
  // такие же поля есть у промежуточных событий.
  const done = body.split('\n').filter(l => l.startsWith('data:'))
    .map(l => { try { return JSON.parse(l.slice(5)) } catch { return null } })
    .filter(Boolean)
    .find(e => e.type === 'response.output_text.done')
  if (!done?.text) throw new Error('в ответе нет response.output_text.done')
  return done.text
}

/**
 * Второй поставщик: GPT через тот же шлюз, но по другому маршруту.
 *
 * Заведён не для разнообразия, а по нужде: Claude-адаптер kie.ai лежал, а
 * /codex/v1/responses на том же ключе и тех же кредитах отвечал нормально.
 * Работа механическая (перевод слова и пример к нему), поэтому поставщик здесь
 * взаимозаменяем — важно, чтобы что-то из двух было живо.
 */
async function viaCodex(prompt, key, model) {
  const res = await fetch('https://api.kie.ai/codex/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: prompt }),
  })
  if (!res.ok) throw new Error(`codex ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return textFromSSE(await res.text())
}

async function translate(words) {
  if (FAKE) return words.map(w => ({ term: w.term, ru: `‹перевод: ${w.term}›`, note: '‹пояснение›', ex: `‹пример с ${w.term}›`, exRu: '‹перевод примера›' }))

  const kie = process.env.KIE_API_KEY
  const key = kie ?? process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('нет ключа: задай ANTHROPIC_API_KEY или KIE_API_KEY (или гоняй с --fake)')

  if (VIA_GPT) {
    if (!kie) throw new Error('--via gpt работает только через шлюз: задай KIE_API_KEY')
    // Пачками, а не одним запросом: на трёх сотнях слов ответ упирается в
    // лимит вывода и обрывается на середине JSON, а обрыв виден только тем, что
    // половина карточек молча не доехала. Сорок слов проходят гарантированно.
    const out = []
    for (let i = 0; i < words.length; i += BATCH) {
      const chunk = words.slice(i, i + BATCH)
      const list = chunk.map(w => `${w.term} — в ${w.episodes} сериях; в реплике: "${w.context}"`).join('\n')
      process.stdout.write(`  пачка ${Math.floor(i / BATCH) + 1}/${Math.ceil(words.length / BATCH)} (${chunk.length} слов)… `)
      try {
        const text = await viaCodex(`${SYSTEM}\n\nСлова:\n${list}`, kie, GPT_MODEL)
        const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
        const parsed = JSON.parse(json)
        out.push(...parsed)
        console.log(`${parsed.length} шт.`)
      } catch (e) {
        // Пачка потеряна — это не повод ронять весь прогон: остальные доедут,
        // а недостающие слова назовёт сверка в конце.
        console.log(`сбой: ${String(e.message).slice(0, 80)}`)
      }
    }
    return out
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // Шлюз kie.ai говорит на диалекте Anthropic, но авторизуется через
  // «Authorization: Bearer», а не «x-api-key» — за это отвечает authToken.
  const client = kie
    ? new Anthropic({ baseURL: 'https://api.kie.ai/claude', authToken: kie })
    : new Anthropic({ apiKey: key })

  const list = words.map(w => `${w.term} — встречается в ${w.episodes} сериях; в реплике: "${w.context}"`).join('\n')
  const res = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: list }],
  })
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('')
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
  return JSON.parse(json)
}

// ─── Сборка ──────────────────────────────────────────────────────────────────

const rank = await loadFreq()
const lemma = makeLemma(rank)

const files = readdirSync(SRT_DIR).filter(f => f.toLowerCase().endsWith('.srt'))
if (!files.length) { console.error(`в ${SRT_DIR} нет .srt`); process.exit(1) }

// Один файл на серию: из нескольких релизов берём тот, чьё имя короче — у
// «чистых» раздач имя без пометок вроде HDTV.XOR.
const byEp = new Map()
for (const f of files) {
  const m = f.match(/(\d{1,2})\s*[xXeE]\s*(\d{2})/) ?? f.match(/[sS](\d{2})[eE](\d{2})/)
  if (!m) { console.warn(`не понял номер серии: ${f} — пропускаю`); continue }
  const key = `${+m[1]}x${m[2]}`
  if (!byEp.has(key) || f.length < byEp.get(key).length) byEp.set(key, f)
}

const episodes = []
for (const [id, f] of [...byEp].sort()) {
  let raw
  try { raw = readFileSync(join(SRT_DIR, f), 'utf8') } catch { raw = readFileSync(join(SRT_DIR, f), 'latin1') }
  const text = speechOf(raw)
  if (!fingerprintOk(text)) { console.warn(`${id}: не похоже на «Сверхъестественное» (${f}) — пропускаю`); continue }
  episodes.push({ id, text })
}
console.log(`серий взято: ${episodes.length}`)

const NAMES = properNames(episodes.map(e => e.text))
const COVERED = alreadyCovered()

// Сколько серий знает слово + одна живая строка на слово (для контекста модели).
const docFreq = new Map(), sample = new Map()
const perEpisode = []
for (const e of episodes) {
  const inEp = new Map()
  for (const line of e.text.split('\n')) {
    for (const raw of line.toLowerCase().replace(/’/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) ?? []) {
      if (raw.length <= 2 || raw.includes("'") || JUNK.has(raw) || INTERJ.test(raw)) continue
      const w = lemma(raw)
      inEp.set(w, (inEp.get(w) ?? 0) + 1)
      if (!sample.has(w) && line.length < 90) sample.set(w, line.trim())
    }
  }
  perEpisode.push({ id: e.id, inEp })
  for (const w of inEp.keys()) docFreq.set(w, (docFreq.get(w) ?? 0) + 1)
}

// ── Разнесение слов по сериям ────────────────────────────────────────────────
//
// Слово достаётся ТОЙ СЕРИИ, ГДЕ ВСТРЕЧАЕТСЯ ВПЕРВЫЕ, и больше нигде не
// повторяется. Это прямо следует из того, зачем колода: её проходят ПЕРЕД
// просмотром, значит слово нужно выдать до первой встречи, а на второй раз оно
// уже знакомо и места в колоде не занимает. Побочный эффект приятный — колоды
// поздних серий сами собой становятся короче.
//
// Внутри серии вес: сначала то, что вернётся чаще (по числу серий), при
// равенстве — то, что звучит чаще в самой серии. Потолок режет хвост, а не
// начало.
const assigned = new Set()
const decks = []
for (const p of perEpisode) {
  const fresh = [...p.inEp]
    .filter(([w]) => docFreq.get(w) >= MIN_EPISODES && (rank.get(w) ?? 1e9) > 4000
      && !NAMES.has(w) && !COVERED.has(w) && !assigned.has(w))
    .sort((a, b) => (docFreq.get(b[0]) - docFreq.get(a[0])) || (b[1] - a[1]))
    .slice(0, CAP)
  fresh.forEach(([w]) => assigned.add(w))
  decks.push({ id: p.id, words: fresh.map(([term, times]) => ({
    term, times, episodes: docFreq.get(term), context: sample.get(term) ?? '', ep: p.id,
  })) })
}

const sizes = decks.map(d => d.words.length)
const candidates = decks.flatMap(d => d.words)
console.log(`колод: ${decks.length} · карточек всего: ${candidates.length}`)
console.log(`на серию: в среднем ${(candidates.length / decks.length).toFixed(1)} · разброс ${Math.min(...sizes)}..${Math.max(...sizes)} (потолок ${CAP})`)
console.log(`имён отброшено: ${NAMES.size} · уже в наборах: ${COVERED.size} слов`)
if (!candidates.length) process.exit(0)

// `--terms` — отбор без перевода: список слов по сериям, с живой строкой на
// каждое. Нужен, когда карточки пишутся руками, а не моделью: тогда от скрипта
// требуется только та часть, которую человек делать не должен, — счёт.
if (args.includes('--terms')) {
  const only = String(flag('--ep', ''))
  for (const d of decks) {
    if (only && !d.id.startsWith(only)) continue
    if (!d.words.length) continue
    console.log(`\n── ${d.id} · ${d.words.length} слов ──`)
    for (const w of d.words) {
      console.log(`${w.term.padEnd(16)} ${String(w.episodes).padStart(3)} серий · ${w.times}× в серии | ${w.context.slice(0, 60)}`)
    }
  }
  process.exit(0)
}

const take = candidates.slice(0, LIMIT)
console.log(`беру ${take.length}${FAKE ? ' (режим --fake, без сети)' : ''}`)
const cards = await translate(take)

// Сверка по слову, а не по позиции: модель может вернуть меньше объектов, чем
// просили, или переставить их. Молчаливая потеря здесь особенно неприятна —
// карточки просто не доезжают, а прогон выглядит успешным, поэтому расхождения
// пишутся вслух.
const byTerm = new Map(take.map(w => [w.term, w]))
const rows = []
const lost = []
for (const c of cards) {
  const src = byTerm.get(String(c.term ?? '').trim().toLowerCase())
  if (!src) { lost.push(c.term ?? '‹без term›'); continue }
  rows.push({ ...c, term: src.term, episodes: src.episodes, ep: src.ep })
}
const missing = take.filter(w => !cards.some(c => String(c.term ?? '').trim().toLowerCase() === w.term))
if (lost.length) console.warn(`не сошлись по слову (${lost.length}): ${lost.slice(0, 8).join(', ')}`)
if (missing.length) console.warn(`модель не вернула (${missing.length}): ${missing.slice(0, 8).map(w => w.term).join(', ')}`)

// ── Раскладка по сезонам ─────────────────────────────────────────────────────
//
// Набор — сезон, а не серия, и это не компромисс: 327 плиток в витрине не
// выбираются вовсе. Серия живёт МЕТКОЙ карточки (`ep`) — по ней внутри набора
// стоит фильтр, и «покажи слова к 1×04» решается без ещё одной сущности.
// Ровно тот же приём, что в соседнем cardSeeds/supernatural.ts.
const bySeason = new Map()
for (const c of rows) {
  const [se, ep] = c.ep.split('x')
  const label = `S${String(se).padStart(2, '0')}E${ep}`
  if (!bySeason.has(se)) bySeason.set(se, [])
  bySeason.get(se).push({ ...c, label })
}
const seasons = [...bySeason].sort((a, b) => +a[0] - +b[0])

const card = c => `      {
        term: ${JSON.stringify(c.term)},
        ru: ${JSON.stringify(c.ru)},
        ep: ${JSON.stringify(c.label)},
        note: ${JSON.stringify(c.note ?? '')},
        ex: { term: ${JSON.stringify(c.ex ?? '')}, ru: ${JSON.stringify(c.exRu ?? '')} },
      },`

const out = `// СГЕНЕРИРОВАНО scripts/buildSpnDecks.mjs — правки руками затрёт следующий прогон.
//
// Отобрано по субтитрам ${episodes.length} серий. В колоду серии попадает слово,
// которое (а) стоит выше B1, (б) вернётся ещё хотя бы в ${MIN_EPISODES - 1} серии, (в) не
// разобрано в других наборах и (г) встречается в этой серии ВПЕРВЫЕ — колоду
// проходят перед просмотром, поэтому слово выдаётся до первой встречи и потом
// не повторяется. Потолок ${CAP} карточек на серию.
//
// Метка \`ep\` — номер серии: по ней внутри набора работает фильтр.

import type { CardSet } from '../../lib/cardGroups'

export const SPN_AUTO_SETS: CardSet[] = [
${seasons.map(([se, cards]) => `  {
    id: 'seed:spn-auto:s${String(se).padStart(2, '0')}',
    title: 'Сезон ${se} · по сериям',
    about: '${cards.length} слов, разложенных по сериям сезона: перед просмотром берёшь метку своей серии.',
    level: 'B1',
    cards: [
${cards.map(card).join('\n')}
    ],
  },`).join('\n')}
]
`

const dest = join(root, 'src/data/cardSeeds/spnAuto.ts')
if (WRITE) {
  writeFileSync(dest, out)
  console.log(`записано: ${dest} (${rows.length} карточек)`)
  console.log('дальше: зарегистрируй набор в cardGroupSeeds.ts и прогони npm run check:gloss')
} else {
  console.log(`\n— без --write файл не записан. Первые строки того, что получилось:\n`)
  console.log(out.split('\n').slice(0, 22).join('\n'))
}

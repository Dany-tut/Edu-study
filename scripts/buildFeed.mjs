#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Собирает кандидатов для ленты: тянет свежее из источников зелёной дорожки и
// складывает в scripts/feed-staging/ по файлу на материал.
//
// ПОЧЕМУ СКРИПТ НЕ ПИШЕТ СРАЗУ В src/data/feed. Заметке из фида не хватает
// ровно того, ради чего она попадает в тренажёр: уровня, словаря и вопросов.
// Сырая статья без них — не материал, а веб-страница. Поэтому скрипт делает
// механическую часть (найти, скачать, очистить, посчитать длину), а разметку
// дописывает человек, и он же смотрит, что вообще попадает на экран к ребёнку.
//
// ПОЧЕМУ НЕ FETCH ИЗ БРАУЗЕРА. Кроме разметки: CORS, CSP, офлайн и прыгающий
// размер бандла. Пять-семь материалов на язык в неделю ученик всё равно не
// выпивает, а сборка заранее означает, что каждый можно просмотреть глазами.
//
//   node scripts/buildFeed.mjs                     — все живые источники
//   node scripts/buildFeed.mjs --outlet nasa       — один источник
//   node scripts/buildFeed.mjs --limit 3           — сколько материалов брать
//   node scripts/buildFeed.mjs --list              — что вообще настроено
//
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'scripts/feed-staging')

const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const has = name => args.includes(`--${name}`)

const LIMIT = Number(flag('limit', 5))
const ONLY = flag('outlet', null)

// ─── Источники ───────────────────────────────────────────────────────────────
//
// Список ЖИВЫХ источников зелёной дорожки. Он намеренно продублирован здесь, а
// не импортируется из src/data/feed: там реестр для интерфейса (подписи,
// лицензии), здесь — как именно тянуть, и это разные знания. Сверка списков —
// дело checkFeed.mjs.

const SOURCES = {
  nasa: {
    lang: 'en',
    name: 'NASA',
    kind: 'rss',
    url: 'https://www.nasa.gov/news-release/feed/',
    license: 'public-domain',
  },
  'agencia-brasil': {
    lang: 'pt-BR',
    name: 'Agência Brasil',
    kind: 'rss',
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    license: 'CC BY 3.0 BR',
  },
  // Викиновости закрыты 04.05.2026 и переведены в read-only. Свежего в них не
  // появится, но архив открыт и лицензия действует, поэтому adapter оставлен:
  // им добирают материал для языков, где живого свободного источника нет.
  'wikinews-ko': { lang: 'ko', name: '위키뉴스', kind: 'wikinews', site: 'ko.wikinews.org', license: 'CC BY-SA 2.5', archive: true },
  'wikinews-ja': { lang: 'ja', name: 'ウィキニュース', kind: 'wikinews', site: 'ja.wikinews.org', license: 'CC BY-SA 2.5', archive: true },
  'wikinews-en': { lang: 'en', name: 'Wikinews', kind: 'wikinews', site: 'en.wikinews.org', license: 'CC BY-SA 2.5', archive: true },
}

// ─── Темы, которых в ленте не будет ──────────────────────────────────────────
//
// Не пометка, а отсев на сборке: заметка про наводнение с погибшими не должна
// попадать в домашку пятикласснику даже под меткой «18+». Список грубый и
// намеренно с запасом — пропущенная война хуже, чем отсеянный матч.

const STOP = [
  'war', 'killed', 'death', 'dead', 'attack', 'strike', 'missile', 'troops', 'shooting',
  'murder', 'assault', 'terror', 'invasion', 'casualt', 'wounded', 'bomb', 'execution',
  'morto', 'morte', 'guerra', 'ataque', 'assassin', 'tiroteio', 'vítima',
  '전쟁', '사망', '사망자', '숨졌', '공격', '테러', '살해', '폭탄', '시신', '체포', '실종',
  '戦争', '死亡', '死者', '攻撃', 'テロ', '殺害', '殺人', '爆弾', '遺体', '逮捕', '失踪', '事件',
]

// Латиница ищется по границе слова, иероглифы — подстрокой. Без этого «war»
// находится в «Award», «Warming» и «toward», и отсев съедает половину NASA.
// Границей считается не \b: у «killed» нужен и «killing», поэтому слово должно
// начинаться с границы, а хвост свободный.
const STOP_RE = STOP.map(w => (/^[\x20-\x7e]+$/.test(w) ? new RegExp(`\\b${w}`, 'i') : null))

const stopped = text => {
  const low = text.toLowerCase()
  for (let i = 0; i < STOP.length; i++) {
    const re = STOP_RE[i]
    if (re ? re.test(text) : low.includes(STOP[i])) return STOP[i]
  }
  return undefined
}

// ─── Сеть ────────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * Запрос с паузой и одной повторной попыткой.
 *
 * Пауза не перестраховка: у Викиновостей на заметку уходит два запроса, и
 * подряд, без пауз, api.php отвечает 429 уже на третьей. Мы здесь гость на
 * чужом сервере — секунда между запросами ничего не стоит, а без неё сборка
 * просто не работает.
 */
let lastCall = 0
async function get(url, retry = true) {
  const wait = 1100 - (Date.now() - lastCall)
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()

  const res = await fetch(url, {
    headers: { 'user-agent': 'student-dashboard feed builder (educational, contact via repo)' },
    signal: AbortSignal.timeout(30_000),
  })
  if (res.status === 429 && retry) {
    console.log('  … 429, ждём 10 секунд')
    await sleep(10_000)
    return get(url, false)
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.text()
}

// ─── Разбор ──────────────────────────────────────────────────────────────────

// Порядок здесь важнее содержания. У Agência Brasil разметка приезжает
// ЭКРАНИРОВАННОЙ (&lt;p&gt;), поэтому мнемоники раскрываются ПЕРВЫМИ, и только
// потом вырезаются теги. В обратном порядке «<p>» появляется уже после чистки
// и уезжает в текст заметки как видимые угловые скобки.
const unescape = s => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&rsquo;/g, '’')
  .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
  .replace(/&#8212;|&mdash;/g, '—').replace(/&#8230;|&hellip;/g, '…')
  .replace(/&#\d+;/g, '')
  .replace(/&amp;/g, '&')

const strip = s => unescape(unescape(s)
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' '))
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&rsquo;/g, '’')
  .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
  .replace(/&#8212;|&mdash;/g, '—').replace(/&#8230;|&hellip;/g, '…')
  .replace(/&#\d+;/g, '')
  .replace(/[ \t]+/g, ' ')
  .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1] : ''
}

/** Абзацы из HTML: <p> сохраняем как границы, всё остальное схлопываем. */
function paragraphs(html) {
  return html
    .replace(/<\/p>|<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n\n')
    .map(strip)
    .filter(p => p.length > 40)
    .filter(p => !/^(Logo |Notícias relacionadas|Edição:|Ouça na Rádio)/i.test(p))
}

// ─── Адаптеры ────────────────────────────────────────────────────────────────

async function fromRss(id, src) {
  const xml = await get(src.url)
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  const out = []

  for (const raw of items) {
    if (out.length >= LIMIT) break

    const title = strip(tag(raw, 'title'))
    const link = strip(tag(raw, 'link'))
    const pub = strip(tag(raw, 'pubDate'))
    // content:encoded несёт полный текст, description — только анонс.
    const body = tag(raw, 'content:encoded') || tag(raw, 'description')
    const creator = strip(tag(raw, 'dc:creator'))

    const paras = paragraphs(body)
    if (!title || !link || paras.length === 0) continue

    const hit = stopped(`${title} ${paras.join(' ')}`)
    if (hit) {
      console.log(`  ✕ «${title.slice(0, 52)}…» — стоп-слово «${hit}»`)
      continue
    }

    out.push({
      outletId: id, lang: src.lang, outlet: src.name, license: src.license,
      title, url: link, date: isoDate(pub), byline: creator || undefined,
      text: paras.join('\n\n'),
    })
  }
  return out
}

async function fromWikinews(id, src) {
  // Свежие сначала: у архива это последние заметки перед закрытием раздела.
  //
  // У архива «свежие» — плохой отбор по смыслу: последнее, что успевает
  // написать закрывающийся новостной раздел, это катастрофы и политика, то
  // есть ровно то, что отсеет STOP. Поэтому есть --category: тянуть из
  // тематической категории («분류:문화», «カテゴリ:科学») вместо общей.
  const category = flag('category', null) ?? categoryOf(src.site)
  const listUrl = `https://${src.site}/w/api.php?action=query&list=categorymembers`
    + `&cmtitle=${encodeURIComponent(category)}&cmsort=timestamp&cmdir=desc`
    + `&cmlimit=${LIMIT * 4}&cmprop=title|timestamp&format=json`
  const list = JSON.parse(await get(listUrl))
  const members = list?.query?.categorymembers ?? []
  const out = []

  for (const m of members) {
    if (out.length >= LIMIT) break
    // В тематической категории вместе со статьями лежат подкатегории. Страница
    // «분류:문화재 훼손» приезжает как заметка на десять слов — это не материал.
    if (/^(분류|カテゴリ|Category|Категория):/.test(m.title)) continue

    const url = `https://${src.site}/w/api.php?action=query&prop=extracts&explaintext=1`
      + `&titles=${encodeURIComponent(m.title)}&format=json`
    const page = Object.values(JSON.parse(await get(url))?.query?.pages ?? {})[0]
    const extract = page?.extract ?? ''

    // У заметки Викиновостей внизу служебные разделы — до них и режем.
    const cut = extract.split(/\n=+\s*(Sources|Источники|출처|情報源|References)\s*=+/)[0]
    const paras = cut.split('\n').map(s => s.trim()).filter(p => p.length > 40)
    if (paras.length === 0) continue

    const hit = stopped(`${m.title} ${paras.join(' ')}`)
    if (hit) {
      console.log(`  ✕ «${m.title.slice(0, 52)}…» — стоп-слово «${hit}»`)
      continue
    }

    out.push({
      outletId: id, lang: src.lang, outlet: src.name, license: src.license,
      title: m.title, url: `https://${src.site}/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`,
      date: (m.timestamp ?? '').slice(0, 10),
      byline: 'участники ' + src.name,
      text: paras.join('\n\n'),
    })
  }
  return out
}

/**
 * Категория опубликованного — в каждом разделе СВОЯ, и по-английски она не
 * называется нигде. Имена сверены запросом к allcategories: у корейцев
 * «발행됨», у японцев «公開中», по смыслу — «выпущено» и «опубликовано».
 */
function categoryOf(site) {
  if (site.startsWith('ko.')) return '분류:발행됨'
  if (site.startsWith('ja.')) return 'カテゴリ:公開中'
  return 'Category:Published'
}

function isoDate(s) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

// В имя файла попадают и иероглифы: у корейского и японского заголовка после
// отсева латиницы не остаётся ничего, и две заметки одного дня из одного
// источника молча ложились в один и тот же файл — вторая затирала первую.
const slug = s => s
  .toLowerCase()
  .replace(/[^a-z0-9а-яё\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+/gi, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 40)

// ─── Прогон ──────────────────────────────────────────────────────────────────

if (has('list')) {
  for (const [id, s] of Object.entries(SOURCES)) {
    console.log(`${id.padEnd(16)} ${s.lang.padEnd(6)} ${s.archive ? 'архив' : 'живой'}  ${s.license}`)
  }
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })

const ids = ONLY ? [ONLY] : Object.keys(SOURCES).filter(id => !SOURCES[id].archive)
let total = 0

for (const id of ids) {
  const src = SOURCES[id]
  if (!src) {
    console.error(`buildFeed: источник «${id}» не настроен. Что есть — node scripts/buildFeed.mjs --list`)
    process.exit(1)
  }

  console.log(`\n${src.name} (${id})${src.archive ? ' — архив, свежего не будет' : ''}`)
  try {
    const items = src.kind === 'wikinews' ? await fromWikinews(id, src) : await fromRss(id, src)
    for (const it of items) {
      const file = join(outDir, `${id}-${it.date}-${slug(it.title)}.json`)
      // У японского и корейского пробелов между словами почти нет, и «5 слов»
      // на заметке в тысячу знаков — не длина, а артефакт счёта. Поэтому у
      // иероглифических языков меряем знаками, у остальных словами.
      const words = /^(ja|ko|zh)/.test(it.lang)
        ? it.text.replace(/\s/g, '').length
        : it.text.split(/\s+/).length
      writeFileSync(file, JSON.stringify({ ...it, words }, null, 2) + '\n', 'utf8')
      const unit = /^(ja|ko|zh)/.test(it.lang) ? 'зн.' : 'сл.'
      console.log(`  ✓ ${it.date}  ${words.toString().padStart(4)} ${unit}  ${it.title.slice(0, 60)}`)
      total++
    }
    if (items.length === 0) console.log('  — ничего не прошло отбор')
  } catch (e) {
    console.error(`  ✕ ${e.message}`)
  }
}

console.log(`\nГотово: ${total} в scripts/feed-staging/`)
console.log('Дальше — разметка руками: уровень, словарь, вопросы, перевод. И глазами посмотреть, что там.')

#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Сборка ленты: тянет свежее из источников и САМА пишет файлы данных.
//
// ПОЧЕМУ ЭТО СТАЛО ВОЗМОЖНО ТОЛЬКО ТЕПЕРЬ. Пока лента показывала вопросы к
// тексту, автоматизировать её было нельзя: вопросы должен писать человек,
// иначе они врут. Лента вопросов больше не показывает — её листают, а не
// проходят, — и всё, что материалу нужно (текст, ролик, словарь по клику),
// собирается машиной.
//
// ЧТО ДЕЛАЕТ СКРИПТ
//   1. Тянет из живых источников: RSS изданий и фиды каналов на YouTube.
//   2. Отсеивает по стоп-списку: войны, происшествия, криминал. Платформа
//      работает с детьми, и «пометить 18+» тут недостаточно.
//   3. Собирает словарь к тексту по data/wordGloss.ts — тем же способом, что
//      разбирает слова читалка: самое длинное совпадение с начала позиции.
//   4. Пишет src/data/feed/auto<Lang>.ts.
//
// ДВА ФАЙЛА НА ЯЗЫК, И ЭТО ГЛАВНОЕ РЕШЕНИЕ. feed<Lang>.ts — РУЧНОЙ: там
// материалы с переводом и разбором, их писал человек. auto<Lang>.ts —
// МАШИННЫЙ, целиком перезаписывается на каждом прогоне. Если бы файл был один,
// первый же автопрогон стёр бы ручную работу — а сливать их кодом означало бы
// писать слияние, которое однажды ошибётся молча.
//
// ЧЕГО СКРИПТ НЕ ДЕЛАЕТ И НЕ БУДЕТ
//   Перевода целиком. Машинного перевода у нас нет, а выдавать его за наш —
//   врать: у автоматических материалов поля `translation` просто нет, и кнопка
//   «Перевод» на них не появляется. Слово по клику при этом работает.
//   Уровня «по тексту». Уровень берётся у ИСТОЧНИКА (см. `level` в SOURCES) и
//   означает «такой язык обычно у этого источника», а не измеренную сложность
//   конкретной заметки. Честная грубая метка лучше точной выдуманной.
//
//   node scripts/buildFeed.mjs --write          — собрать и записать файлы
//   node scripts/buildFeed.mjs                  — только показать, что нашлось
//   node scripts/buildFeed.mjs --limit 8        — сколько брать с источника
//   node scripts/buildFeed.mjs --outlet nasa    — один источник
//   node scripts/buildFeed.mjs --list           — что настроено
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/data/feed')
const stageDir = join(root, 'scripts/feed-staging')

const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const has = name => args.includes(`--${name}`)

const LIMIT = Number(flag('limit', 6))
const ONLY = flag('outlet', null)
const WRITE = has('write')
/** Сколько материалов держим в автоленте на язык. Старое вытесняется новым. */
const KEEP = Number(flag('keep', 24))

// ─── Источники ───────────────────────────────────────────────────────────────
//
// ПРОВЕРЕНО ЗАПРОСОМ. Здесь только те, чьи фиды реально отвечают: адреса «по
// памяти» у половины кандидатов дали 404, а два раздела, на которых строился
// первоначальный план (Викиновости, VOA Learning English), закрыты совсем.
//
// `lane` — правовой режим: 'free' текст можно показать целиком, 'embed' живёт в
// чужом плеере, 'link' — только заголовок и ссылка.

const SOURCES = {
  nasa: {
    lang: 'en', name: 'NASA', kind: 'rss', lane: 'free', level: 'B2',
    topic: 'Технологии и медиа',
    url: 'https://www.nasa.gov/news-release/feed/',
  },
  'agencia-brasil': {
    lang: 'pt-BR', name: 'Agência Brasil', kind: 'rss', lane: 'free', level: 'B1',
    topic: 'Технологии и медиа',
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    byline: 'Agência Brasil',
  },
  'sbs-news': {
    lang: 'ko', name: 'SBS 뉴스', kind: 'youtube', lane: 'embed', level: 'TOPIK 4급',
    topic: 'Технологии и медиа',
    channel: 'UCkinYTS9IHqOEwR1Sze2JTw',
  },
  'ann-news': {
    lang: 'ja', name: 'ANNニュース', kind: 'youtube', lane: 'embed', level: 'JLPT N2',
    topic: 'Технологии и медиа',
    channel: 'UCGCZAYq5Xxojl_tSXcVJhiQ',
  },
  ted: {
    lang: 'en', name: 'TEDx Talks', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Технологии и медиа',
    channel: 'UCAuUUnT6oDeKwE6v1NGQxug',
  },
  // Викиновости закрыты 04.05.2026 и переведены в read-only: свежего не будет.
  // Адаптер оставлен, но в автопрогон эти источники не входят (archive: true) —
  // им ДОБИРАЮТ материал руками, когда нужно.
  'wikinews-ko': { lang: 'ko', name: '위키뉴스', kind: 'wikinews', site: 'ko.wikinews.org', archive: true },
  'wikinews-ja': { lang: 'ja', name: 'ウィキニュース', kind: 'wikinews', site: 'ja.wikinews.org', archive: true },
  'wikinews-en': { lang: 'en', name: 'Wikinews', kind: 'wikinews', site: 'en.wikinews.org', archive: true },
}

/** Файл автоленты на язык. Ключ — базовый код языка. */
const AUTO_FILES = {
  en: { file: 'autoEn.ts', konst: 'EN_AUTO' },
  ko: { file: 'autoKo.ts', konst: 'KO_AUTO' },
  ja: { file: 'autoJa.ts', konst: 'JA_AUTO' },
  pt: { file: 'autoPt.ts', konst: 'PT_AUTO' },
}

// ─── Чего в ленте не будет ───────────────────────────────────────────────────

const STOP = [
  'war', 'killed', 'death', 'dead', 'attack', 'strike', 'missile', 'troops', 'shooting',
  'murder', 'assault', 'terror', 'invasion', 'casualt', 'wounded', 'bomb', 'execution',
  'morto', 'morte', 'guerra', 'ataque', 'assassin', 'tiroteio', 'vítima',
  '전쟁', '사망', '사망자', '숨졌', '공격', '테러', '살해', '폭탄', '시신', '체포', '실종', '마약', '흉기',
  // Суд, следствие и политика: формально не «происшествие», но и не то, что
  // нужно ученику в ленте. Проверено на выдаче SBS — без этих слов туда
  // приезжали приговоры, обыски и предвыборная перепалка.
  '성범죄', '무죄', '유죄', '재판', '판결', '항소심', '검찰', '경찰', '소송', '피고', '구속', '수사',
  '대통령', '의원', '선거', '자살', '사고', '부상',
  '戦争', '死亡', '死者', '攻撃', 'テロ', '殺害', '殺人', '爆弾', '遺体', '逮捕', '失踪', '事件',
  '提訴', '裁判', '判決', '容疑', '起訴', '捜査', '自殺', '事故', 'けが', '負傷', '被害',
]

// Латиница ищется по границе слова, иероглифы — подстрокой. Без этого «war»
// находится в «Award», «Warming» и «toward», и отсев съедает половину NASA.
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
 * Запрос с паузой и одной повторной попыткой. Пауза не перестраховка: у
 * Викиновостей на заметку уходит два запроса, и подряд, без пауз, api.php
 * отвечает 429 уже на третьей.
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

// Порядок важнее содержания: у Agência Brasil разметка приезжает
// ЭКРАНИРОВАННОЙ (&lt;p&gt;), поэтому мнемоники раскрываются ПЕРВЫМИ, и только
// потом вырезаются теги. В обратном порядке «<p>» уезжает в текст заметки как
// видимые угловые скобки.
const unescape = s => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&rsquo;|&apos;/g, '’')
  .replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
  .replace(/&#8212;|&mdash;/g, '—').replace(/&#8230;|&hellip;/g, '…')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&')

const strip = s => unescape(unescape(s)
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ')
  .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? m[1] : ''
}

function paragraphs(html) {
  return html
    .replace(/<\/p>|<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n\n')
    .map(strip)
    .filter(p => p.length > 40)
    .filter(p => !/^(Logo |Notícias relacionadas|Edição:|Ouça na Rádio)/i.test(p))
}

const isoDate = s => {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

const base = lang => lang.split('-')[0].toLowerCase()

/** Стабильный id: один и тот же материал получает его при любом прогоне. */
const idFor = (outletId, key) =>
  `auto-${outletId}-${createHash('sha1').update(key).digest('hex').slice(0, 8)}`

// ─── Словарь к тексту ────────────────────────────────────────────────────────
//
// Берём из data/wordGloss.ts тем же способом, что и читалка: ищем самое длинное
// совпадение с начала позиции и продолжаем со следующей. Морфологии нет и не
// нужно — словарь хранит поверхностные формы.
//
// Читаем ФАЙЛ РЕГУЛЯРКОЙ, а не импортом: скрипт на Node, файл на TypeScript, и
// тащить сюда сборщик ради словаря дороже, чем разобрать его построчно. Так же
// устроены checkScenes и checkFeed.

function loadGloss() {
  const src = readFileSync(join(root, 'src/data/wordGloss.ts'), 'utf8')
  const byLang = {}
  for (const key of ['EN', 'KO', 'JA', 'PT']) {
    const block = src.match(new RegExp(`const ${key}: WordGloss\\[\\] = \\[([\\s\\S]*?)\\n\\]`))
    if (!block) continue
    const map = new Map()
    // Записи в словаре двух видов: helper `w('слово', 'перевод', 'пометка')` —
    // так написано подавляющее большинство — и обычный объектный литерал.
    // Разбираем оба: пропустить первый вид значило бы получить пустой словарь и
    // не заметить этого (пустой словарь не ошибка, просто ноль слов в ленте).
    const pats = [
      /\bw\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g,
      /\{\s*term:\s*'((?:[^'\\]|\\.)*)'\s*,\s*ru:\s*'((?:[^'\\]|\\.)*)'/g,
    ]
    for (const re of pats) {
      for (const m of block[1].matchAll(re)) {
        const term = m[1].replace(/\\'/g, "'")
        const ru = m[2].replace(/\\'/g, "'")
        if (!map.has(term)) map.set(term, ru)
      }
    }
    byLang[key.toLowerCase()] = map
  }
  return byLang
}

/**
 * Словарь к тексту: слова В ПОРЯДКЕ ПОЯВЛЕНИЯ, до `max` штук.
 *
 * Порядок здесь — не косметика. Первая версия брала самые ДЛИННЫЕ словарные
 * совпадения, и в словарь к докладу TED уезжали «conferences», «translation»,
 * «membership» — слова из служебного описания канала, которых в самом ролике
 * нет. Читается такой словарь как издевательство: ученик ищет их в тексте и не
 * находит.
 *
 * Поэтому идём по тексту слева направо и на каждой позиции берём самое длинное
 * совпадение — ровно так же, как разбирает слова читалка (lib/lexicon.ts).
 * Для корейского и японского это единственный рабочий способ (пробелов между
 * словами нет), для латиницы — просто честный.
 */
function glossFor(text, langKey, gloss, max = 12) {
  const dict = gloss[langKey]
  if (!dict || !text) return []

  const latin = langKey === 'en' || langKey === 'pt'
  const found = new Map()

  if (latin) {
    // Служебные слова в словаре текста — шум, из-за которого не видно нужного.
    for (const raw of text.toLowerCase().match(/[a-zà-ÿ']+/g) ?? []) {
      if (found.size >= max) break
      if (raw.length < 4) continue
      const ru = dict.get(raw)
      if (ru && !found.has(raw)) found.set(raw, ru)
    }
  } else {
    // Самое длинное совпадение с текущей позиции, дальше — со следующей.
    const maxLen = 8
    for (let i = 0; i < text.length && found.size < max;) {
      let hit = null
      for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
        const cand = text.slice(i, i + len)
        const ru = dict.get(cand)
        if (ru) { hit = [cand, ru]; break }
      }
      if (hit) {
        if (!found.has(hit[0])) found.set(hit[0], hit[1])
        i += hit[0].length
      } else {
        i++
      }
    }
  }

  return [...found].map(([term, ru]) => ({ term, ru }))
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
    const body = tag(raw, 'content:encoded') || tag(raw, 'description')
    const creator = strip(tag(raw, 'dc:creator'))

    const paras = paragraphs(body)
    if (!title || !link || paras.length === 0) continue

    const hit = stopped(`${title} ${paras.join(' ')}`)
    if (hit) { console.log(`  ✕ «${title.slice(0, 48)}…» — стоп-слово «${hit}»`); continue }

    out.push({
      outletId: id, lang: src.lang, lane: src.lane, level: src.level, topic: src.topic,
      title, url: link, date: isoDate(pub),
      byline: creator || src.byline || undefined,
      // Три абзаца — предел поста в ленте. Дальше читают у источника; и это не
      // экономия места, а то же правило, что у превью в мессенджере.
      text: paras.slice(0, 3).join('\n\n'),
    })
  }
  return out
}

async function fromYoutube(id, src) {
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${src.channel}`)
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const out = []

  for (const e of entries) {
    if (out.length >= LIMIT) break
    const vid = (e.match(/<yt:videoId>(.*?)<\/yt:videoId>/) ?? [])[1]
    const title = strip(tag(e, 'title'))
    const published = (e.match(/<published>(.*?)<\/published>/) ?? [])[1] ?? ''
    const desc = strip((e.match(/<media:description>([\s\S]*?)<\/media:description>/) ?? [])[1] ?? '')
    if (!vid || !title) continue

    // Отсеиваем и по описанию: в заголовке сюжета про происшествие может не
    // быть ни одного стоп-слова, а в расшифровке — половина списка.
    const hit = stopped(`${title} ${desc}`)
    if (hit) { console.log(`  ✕ «${title.slice(0, 48)}…» — стоп-слово «${hit}»`); continue }

    // Многочасовые прямые эфиры — не материал: их не смотрят с начала и в них
    // нет одной темы.
    if (/【ライブ】|LIVE|생중계|실시간/i.test(title)) {
      console.log(`  ✕ «${title.slice(0, 48)}…» — прямой эфир`)
      continue
    }

    out.push({
      outletId: id, lang: src.lang, lane: src.lane, level: src.level, topic: src.topic,
      title, url: `https://www.youtube.com/watch?v=${vid}`,
      date: published.slice(0, 10) || new Date().toISOString().slice(0, 10),
      video: vid,
      // Расшифровку из описания НЕ берём в body: она принадлежит каналу.
      // Она нужна только чтобы собрать словарь к ролику.
      hint: desc,
      text: '',
    })
  }
  return out
}

async function fromWikinews(id, src) {
  const category = flag('category', null) ?? categoryOf(src.site)
  const listUrl = `https://${src.site}/w/api.php?action=query&list=categorymembers`
    + `&cmtitle=${encodeURIComponent(category)}&cmsort=timestamp&cmdir=desc`
    + `&cmlimit=${LIMIT * 4}&cmprop=title|timestamp&format=json`
  const list = JSON.parse(await get(listUrl))
  const members = list?.query?.categorymembers ?? []
  const out = []

  for (const m of members) {
    if (out.length >= LIMIT) break
    if (/^(분류|カテゴリ|Category|Категория):/.test(m.title)) continue

    const url = `https://${src.site}/w/api.php?action=query&prop=extracts&explaintext=1`
      + `&titles=${encodeURIComponent(m.title)}&format=json`
    const page = Object.values(JSON.parse(await get(url))?.query?.pages ?? {})[0]
    const extract = page?.extract ?? ''
    const cut = extract.split(/\n=+\s*(Sources|Источники|출처|情報源|References)\s*=+/)[0]
    const paras = cut.split('\n').map(s => s.trim()).filter(p => p.length > 40)
    if (paras.length === 0) continue

    const hit = stopped(`${m.title} ${paras.join(' ')}`)
    if (hit) { console.log(`  ✕ «${m.title.slice(0, 48)}…» — стоп-слово «${hit}»`); continue }

    out.push({
      outletId: id, lang: src.lang, lane: 'free', level: src.level ?? '', topic: src.topic ?? 'Технологии и медиа',
      title: m.title,
      url: `https://${src.site}/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`,
      date: (m.timestamp ?? '').slice(0, 10),
      byline: `участники ${src.name}`,
      text: paras.slice(0, 3).join('\n\n'),
    })
  }
  return out
}

/** Категория опубликованного — в каждом разделе своя, сверено с allcategories. */
function categoryOf(site) {
  if (site.startsWith('ko.')) return '분류:발행됨'
  if (site.startsWith('ja.')) return 'カテゴリ:公開中'
  return 'Category:Published'
}

// ─── Запись файлов ───────────────────────────────────────────────────────────

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const tpl = s => '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'

function emit(langKey, items) {
  const { file, konst } = AUTO_FILES[langKey]
  const head = `// ─────────────────────────────────────────────────────────────────────────────
// АВТОМАТИЧЕСКАЯ ЧАСТЬ ЛЕНТЫ. НЕ ПРАВИТЬ РУКАМИ.
//
// Файл целиком перезаписывается сборкой: \`npm run build:feed\`. Любая правка
// здесь исчезнет на ближайшем прогоне — материалы с переводом и разбором
// пишутся в feed${langKey[0].toUpperCase()}${langKey[1]}.ts, который скрипт не трогает.
//
// Уровень у этих материалов — уровень ИСТОЧНИКА, а не измеренная сложность
// заметки: «такой язык обычно у этого канала». Перевода целиком нет — машинного
// перевода в проекте нет, а выдавать его за свой нельзя; слово по клику
// работает, оно собрано по data/wordGloss.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeedItem } from './index'

export const ${konst}: FeedItem[] = [
`

  const body = items.map(it => {
    const lines = [
      `    id: ${q(it.id)},`,
      `    outletId: ${q(it.outletId)},`,
      `    lang: ${q(it.lang)},`,
      `    title: ${q(it.title)},`,
      `    date: ${q(it.date)},`,
      `    lane: ${q(it.lane)},`,
      `    textOrigin: ${q(it.lane === 'free' ? 'verbatim' : 'ours')},`,
      `    age: '12+',`,
      `    url: ${q(it.url)},`,
    ]
    if (it.byline) lines.push(`    byline: ${q(it.byline)},`)
    if (it.video) lines.push(`    embed: { kind: 'youtube', id: ${q(it.video)} },`)
    lines.push(
      `    origin: ${q(it.lane === 'free' ? 'open-corpus' : 'original')},`,
      `    level: ${q(it.level)},`,
      `    minutes: ${it.minutes},`,
      `    topic: ${q(it.topic)},`,
      `    skill: ${q(it.video ? 'Аудирование' : 'Чтение')},`,
      `    body: ${it.text ? tpl(it.text) : "''"},`,
      `    glossary: [${it.glossary.map(g => `\n      { term: ${q(g.term)}, ru: ${q(g.ru)} },`).join('')}${it.glossary.length ? '\n    ' : ''}],`,
      `    questions: [],`,
    )
    return `  {\n${lines.join('\n')}\n  },`
  }).join('\n')

  writeFileSync(join(dataDir, file), head + body + '\n]\n', 'utf8')
  return items.length
}

// ─── Прогон ──────────────────────────────────────────────────────────────────

if (has('list')) {
  for (const [id, s] of Object.entries(SOURCES)) {
    console.log(`${id.padEnd(16)} ${s.lang.padEnd(6)} ${(s.lane ?? '—').padEnd(6)} ${s.archive ? 'архив' : 'живой'}`)
  }
  process.exit(0)
}

const gloss = loadGloss()
console.log(`Словарь: ${Object.entries(gloss).map(([k, v]) => `${k} ${v.size}`).join(', ')}\n`)
// Пустой словарь выглядит как «слов в тексте не нашлось» и молча оставляет
// ленту без разбора по клику. Это поломка разбора файла, и она должна падать.
for (const [k, v] of Object.entries(gloss)) {
  if (v.size < 100) {
    console.error(`buildFeed: словарь «${k}» разобран как ${v.size} записей — сломался парсер wordGloss.ts`)
    process.exit(1)
  }
}

const ids = ONLY ? [ONLY] : Object.keys(SOURCES).filter(id => !SOURCES[id].archive)
const collected = {}

for (const id of ids) {
  const src = SOURCES[id]
  if (!src) {
    console.error(`buildFeed: источник «${id}» не настроен. Что есть — --list`)
    process.exit(1)
  }

  console.log(`${src.name} (${id})${src.archive ? ' — архив' : ''}`)
  try {
    const raw = src.kind === 'wikinews' ? await fromWikinews(id, src)
      : src.kind === 'youtube' ? await fromYoutube(id, src)
      : await fromRss(id, src)

    const langKey = base(src.lang)
    for (const it of raw) {
      const cjk = /^(ja|ko|zh)/.test(it.lang)
      const size = cjk ? it.text.replace(/\s/g, '').length : it.text.split(/\s+/).filter(Boolean).length
      const item = {
        ...it,
        id: idFor(id, it.url),
        // Минуты: 180 слов или 400 знаков в минуту для текста; у ролика без
        // длительности в фиде ставим три — столько идёт обычный сюжет.
        minutes: it.video ? 3 : Math.max(1, Math.round(size / (cjk ? 400 : 180))),
        // У ролика в ленте виден только заголовок — по нему словарь и
        // собираем. Разбирать описание канала бессмысленно: ученик его не
        // видит, а в словарь уезжают «подписывайтесь» и «расшифровка».
        glossary: glossFor(it.video ? it.title : `${it.title}\n${it.text}`, langKey, gloss, it.video ? 8 : 12),
      }
      ;(collected[langKey] ??= []).push(item)
      console.log(`  ✓ ${item.date}  ${item.glossary.length.toString().padStart(2)} сл.  ${item.title.slice(0, 56)}`)
    }
    if (raw.length === 0) console.log('  — ничего не прошло отбор')
  } catch (e) {
    console.error(`  ✕ ${e.message}`)
  }
}

if (!WRITE) {
  // Без --write складываем в staging, чтобы можно было посмотреть глазами.
  mkdirSync(stageDir, { recursive: true })
  let n = 0
  for (const items of Object.values(collected)) {
    for (const it of items) {
      writeFileSync(join(stageDir, `${it.id}.json`), JSON.stringify(it, null, 2) + '\n', 'utf8')
      n++
    }
  }
  console.log(`\nЧерновики: ${n} в scripts/feed-staging/. Записать в ленту — прогнать с --write.`)
  process.exit(0)
}

console.log('')
for (const [langKey, cfg] of Object.entries(AUTO_FILES)) {
  const fresh = collected[langKey] ?? []

  // Старое не выбрасываем, а домешиваем: источник мог за сутки не опубликовать
  // ничего, и лента не должна от этого опустеть. Дубли снимаются по id, а он
  // стабилен — тот же материал на втором прогоне не удвоится.
  const path = join(dataDir, cfg.file)
  const old = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const keptIds = new Set(fresh.map(x => x.id))
  const kept = []
  for (const m of old.matchAll(/^ {2}\{\n([\s\S]*?)^ {2}\},$/gm)) {
    const id = (m[1].match(/id: '([^']+)'/) ?? [])[1]
    if (id && !keptIds.has(id)) kept.push({ raw: m[0], date: (m[1].match(/date: '([^']+)'/) ?? [])[1] ?? '' })
  }

  const merged = [
    ...fresh.map(x => ({ item: x, date: x.date })),
    ...kept.map(x => ({ raw: x.raw, date: x.date })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, KEEP)

  // Пишем свежие как объекты, старые — как есть: перегенерировать уже
  // записанное значило бы каждый раз заново собирать им словарь и получать
  // разный результат на одном и том же тексте.
  const newOnes = merged.filter(x => x.item).map(x => x.item)
  emit(langKey, newOnes)
  const tail = merged.filter(x => x.raw).map(x => x.raw).join('\n')
  if (tail) {
    const src = readFileSync(path, 'utf8')
    writeFileSync(path, src.replace(/\n\]\n$/, `\n${tail}\n]\n`), 'utf8')
  }
  console.log(`${cfg.file.padEnd(12)} свежих ${newOnes.length}, оставлено ${merged.length - newOnes.length}, всего ${merged.length}`)
}

console.log('\nДальше: node scripts/checkFeed.mjs --fix — пересчитать счётчики.')

#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Пересказ новостей ленты по уровням — и словарь к ним
//
// ЗАЧЕМ. Научная новость на корейском в свободном доступе бывает одного вида:
// ведомственный релиз. Это 5급 и выше, и ученику второго года она закрыта — не
// темой, а ЯЗЫКОМ. Галактика понятна и на втором году; «가시광선이 아니라
// 엑스선» — нет. Скрипт рассказывает одну и ту же новость трижды, от простого к
// газетному, и лестница переключается прямо в посте.
//
// ЧТО ИМЕННО ОН ДЕЛАЕТ
//   1. Берёт свежие материалы автоленты — но только из источников, где
//      ПЕРЕРАБОТКА разрешена (см. ALLOWED ниже).
//   2. Просит модель пересказать каждый на трёх уровнях целевого языка.
//   3. Выписывает КАЖДОЕ слово получившегося текста, которого нет в словаре
//      тапа, и просит перевести их же.
//   4. Пересчитывает дыры заново. Остались — материал НЕ БЕРЁТСЯ.
//   5. Пишет src/data/feed/adapt<Lang>.ts и src/data/wordGlossAuto.ts.
//
// ПУНКТ 4 — ГЛАВНЫЙ, И ОН НЕ ФОРМАЛЬНОСТЬ. Вся читалка держится на обещании
// «ткни в любое слово и получи перевод». Текст, сочинённый ночью, ломает его
// первым же незнакомым термином, и ломает МОЛЧА: сборка не падает, сторож
// гоняется отдельно, а видит это только тот, кто читает. Поэтому пересказ,
// который не удалось покрыть словарём, выбрасывается целиком — лучше на один
// материал меньше, чем один тупик на странице.
//
// ЧТО СКРИПТ НЕ ДЕЛАЕТ
//   Не трогает feed<Lang>.ts — там материалы, написанные человеком.
//   Не пересказывает то, что нельзя перерабатывать: у CC BY-ND переработка
//   запрещена прямо, у CC BY-SA пересказ пришлось бы отдать под ту же
//   лицензию. Список разрешённого — ALLOWED, обоснование — docs/FEED_SOURCES.md.
//   Не выдаёт пересказ за первоисточник: `textOrigin: 'ours'`, отдельный
//   источник в шапке и строка «по материалу …» под текстом.
//
//   node scripts/adaptFeed.mjs                 — показать, что получится
//   node scripts/adaptFeed.mjs --write         — записать файлы
//   node scripts/adaptFeed.mjs --lang ko       — только один язык
//   node scripts/adaptFeed.mjs --limit 2       — сколько материалов за прогон
//   node scripts/adaptFeed.mjs --plan          — что взял бы, без обращений к модели
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/data')

const args = process.argv.slice(2)
const has = n => args.includes(`--${n}`)
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d
}
const WRITE = has('write')
const PLAN = has('plan')
// Прогон без сети: см. fake() ниже.
const FAKE = has('fake')
const ONLY = flag('lang', null)
const LIMIT = Number(flag('limit', 2))

/**
 * Сколько пересказов держим на язык.
 *
 * Двенадцать — это примерно две недели по одному материалу в день. Больше не
 * нужно: пересказ живёт рядом с обычной лентой, а не вместо неё, и чанк языка
 * не должен расти ради текстов, которые всё равно листают сверху вниз.
 */
const KEEP = Number(flag('keep', 12))

// ─── Что можно перерабатывать ────────────────────────────────────────────────
//
// Пересказ — производное произведение. Общественное достояние (федеральные
// агентства США) и KOGL 제1유형 переработку разрешают; CC BY-ND запрещает её
// прямо, CC BY-SA требует отдать результат под той же лицензией. Список
// закрытый и проверяется по outletId, а не по словам в лицензии: строка
// лицензии — текст для человека, и опечатка в ней не должна открывать дверь.
const ALLOWED = new Set([
  'nasa', 'nist', 'nsf', 'noaa', 'cdc', 'fda', 'doe',
  'korea-kr-society', 'korea-kr-culture', 'korea-kr-economy',
  'korea-kr-ai', 'korea-kr-research', 'korea-kr-space',
  'korea-kr-health', 'korea-kr-chip', 'korea-kr-car',
])

// ─── Лестницы уровней ────────────────────────────────────────────────────────
//
// Ступени НЕ равны уровню ученика: читать всегда легче, чем говорить, и первая
// ступень нарочно ниже той, на которой он занимается. Верхняя, наоборот, не
// упрощена — смысл лестницы в том, чтобы по ней подняться.
const LADDERS = {
  ko: {
    outlet: 'sci-retold-ko',
    file: 'adaptKo.ts',
    konst: 'KO_ADAPT',
    name: 'корейском',
    levels: [
      { level: 'TOPIK 3급', minutes: 2, hint: 'Простые короткие предложения, вежливый стиль на -습니다/-ㅂ니다. Только самая ходовая лексика; термин, без которого не обойтись, вводится с пояснением обычными словами.' },
      { level: 'TOPIK 4급', minutes: 3, hint: 'Письменный стиль на -다 (해라체 для текста), предложения длиннее, допустимы придаточные и специальные слова темы.' },
      { level: 'TOPIK 5급', minutes: 3, hint: 'Газетный язык: сложные конструкции, точная терминология, плотная подача — как пишет 정책브리핑.' },
    ],
  },
  en: {
    outlet: 'sci-retold-en',
    file: 'adaptEn.ts',
    konst: 'EN_ADAPT',
    name: 'английском',
    levels: [
      { level: 'B1', minutes: 2, hint: 'Short sentences, everyday words, present and past simple. Any technical term is explained in plain words right where it appears.' },
      { level: 'B2', minutes: 3, hint: 'Longer sentences, some subordination, the topic’s real vocabulary, a clear line of argument.' },
      { level: 'C1', minutes: 4, hint: 'The register of quality science journalism: precise terminology, dense clauses, no hand-holding.' },
    ],
  },
  ja: {
    outlet: 'sci-retold-ja',
    file: 'adaptJa.ts',
    konst: 'JA_ADAPT',
    name: 'японском',
    levels: [
      { level: 'JLPT N4', minutes: 2, hint: 'やさしい日本語: короткие предложения, простые кандзи, です・ます.' },
      { level: 'JLPT N3', minutes: 3, hint: 'Обычный письменный японский, だ・である, лексика темы.' },
      { level: 'JLPT N2', minutes: 3, hint: 'Газетный японский: плотные конструкции, точные термины.' },
    ],
  },
}

// Темы берутся из уже заведённых в ленте — новый ярлык на каждый материал
// превратил бы фильтр в свалку.
const TOPICS = [
  'Наука', 'Технологии и ИИ', 'Медицина и здоровье', 'Машины и транспорт',
  'Искусство и история', 'Погода и природа', 'Учёба',
]

// ─── Данные проекта ──────────────────────────────────────────────────────────
//
// Node умеет исполнять .ts сам, но только с явными расширениями в импортах, а
// внутри src их нет — там разрешение берёт на себя Vite. Поэтому собираем то,
// что нужно скрипту, тем же esbuild, которым собирается приложение.
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'adapt-'))
const bundle = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { buildLexicon } from './src/lib/lexicon'
      export { EN_AUTO } from './src/data/feed/autoEn'
      export { KO_AUTO } from './src/data/feed/autoKo'
      export { JA_AUTO } from './src/data/feed/autoJa'
      export { KO_ADAPT } from './src/data/feed/adaptKo'
      export { EN_ADAPT } from './src/data/feed/adaptEn'
      export { JA_ADAPT } from './src/data/feed/adaptJa'
      export { AUTO_GLOSS } from './src/data/wordGlossAuto'
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
})
const M = await import(pathToFileURL(bundle).href)
rmSync(tmp, { recursive: true, force: true })

const POOL = [...M.EN_AUTO, ...M.KO_AUTO, ...M.JA_AUTO]
const EXISTING = { ko: M.KO_ADAPT, en: M.EN_ADAPT, ja: M.JA_ADAPT }

// ─── Дыры разбора ────────────────────────────────────────────────────────────
//
// ПЛАНКА ЗДЕСЬ ВЫШЕ, ЧЕМ У СТОРОЖА, И НАМЕРЕННО. Сторож (checkGloss.mjs) считает
// тупиком только то, что не даёт НИ перевода, НИ разбора по составу: слово с
// разбором — не тупик, там видно, из чего оно собрано. Для ЧУЖОГО текста это
// правильная планка: незнакомое имя собственное разобрать нельзя, а выбрасывать
// из-за него новость незачем.
//
// Но этот текст пишем МЫ. Если в нашем же пересказе стоит слово, которого мы
// перевести не можем, — это не «сложное слово в новости», это мы его выбрали и
// не объяснили. Поэтому здесь дыра — всё, у чего нет перевода целиком и хотя бы
// одна часть разбора осталась без перевода. Иначе 뷁쀍은 проходило бы проверку
// на том основании, что переведена частица 은.
function holes(lang, text, extra) {
  const lex = M.buildLexicon(lang, extra)
  const out = new Set()
  for (const seg of lex.segment(text)) {
    if (!seg.word || seg.gloss) continue
    if (seg.parts?.length && seg.parts.every(p => p.gloss)) continue
    out.add(seg.text)
  }
  return [...out]
}

// ─── Схемы ответа ────────────────────────────────────────────────────────────
//
// Структурированный вывод, а не «попроси JSON и распарси»: разбор чужого текста
// регуляркой ломается на первой же кавычке внутри корейской цитаты, а тут
// форма ответа гарантирована схемой.
const Adaptation = z.object({
  title: z.string(),
  topic: z.enum(TOPICS),
  levels: z.array(z.object({
    level: z.string(),
    minutes: z.number().int(),
    body: z.string(),
  })),
})

const Glossary = z.object({
  words: z.array(z.object({
    term: z.string(),
    ru: z.string(),
    /** Пометка: часть речи, форма, оговорка. Пустая строка — пометки нет. */
    note: z.string(),
  })),
})

const SYSTEM = `Ты пишешь тексты для платформы, на которой подростки учат иностранные языки.

ЧТО ОТ ТЕБЯ НУЖНО. Взять новость и рассказать её ЗАНОВО на указанном языке, несколько раз — по одному разу на каждую ступень сложности. Это не перевод и не сокращение: это твой текст о том же событии.

ЖЁСТКИЕ ПРАВИЛА:
1. НИЧЕГО НЕ ВЫДУМЫВАЙ. Только факты из исходного материала. Нет факта в источнике — нет его и в пересказе.
2. Числа, даты, имена, названия организаций и приборов переноси точно.
3. НЕ КОПИРУЙ формулировки источника. Строй фразу сам, иначе это уже не пересказ.
4. Ступени рассказывают ОДНО И ТО ЖЕ событие. Простая ступень — не огрызок: у неё тот же смысл, просто сказанный проще. Верхняя ступень НЕ упрощается.
5. Аудитория — подростки. Никакой политики, военных действий, происшествий с пострадавшими. Если материал целиком об этом — верни пустой список ступеней.
6. Слова выбирай самые обиходные из подходящих: каждое редкое слово придётся отдельно переводить в словаре.
7. Абзацы разделяй пустой строкой. Два-четыре абзаца на ступень. Без заголовков, списков и разметки внутри текста.
8. Заголовок — на языке пересказа, короткий, без кавычек по краям.`

const client = FAKE ? null : new Anthropic()

/**
 * Подставной ответ вместо обращения к модели (`--fake`).
 *
 * Нужен не для красоты: у конвейера есть длинный кусок, к сети отношения не
 * имеющий, — отбор кандидатов, пересчёт дыр, отсев непокрытого текста, запись
 * двух файлов. Проверять его настоящими запросами и дорого, и медленно, а
 * незамеченная опечатка в записи файла уронит ночную сборку молча.
 *
 * Текст нарочно содержит слово, которого в словаре нет: так прогон проходит и
 * через второй запрос (словарь), и через повторную проверку дыр.
 */
function fake(kind, lang, prompt) {
  // Словарь отвечает ровно на то, что спросили: так проверяется и то, что
  // список дыр доезжает до запроса, и то, что ответ их закрывает.
  if (kind === 'gloss') {
    const line = (prompt.match(/СЛОВА: (.*)/) ?? [])[1] ?? ''
    return {
      words: line.split(',').map(w => w.trim()).filter(Boolean)
        .map(term => ({ term, ru: 'подставной перевод', note: '' })),
    }
  }
  const ladder = LADDERS[lang]
  // В тексте нарочно стоит слово, которого в словаре нет и быть не может:
  // прогон обязан пройти через второй запрос и повторную проверку дыр.
  const body = lang === 'ko' ? '오늘 학교에 갑니다. 뷁쀍은 내일 옵니다.'
    : lang === 'ja' ? 'きょう がっこう に いきます。ヷヸ が きます。'
    : 'Today we go to school. The zzqxwv arrives tomorrow.'
  return {
    title: lang === 'ko' ? '학교' : lang === 'ja' ? 'がっこう' : 'School',
    topic: 'Наука',
    levels: ladder.levels.map(l => ({ level: l.level, minutes: l.minutes, body })),
  }
}

async function ask(kind, schema, prompt) {
  if (FAKE) return { data: fake(kind, ONLY ?? 'ko', prompt) }
  const res = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(schema) },
    messages: [{ role: 'user', content: prompt }],
  })
  // Отказ классификатора — не ошибка скрипта: материал просто не берём.
  // Новостей за ночь приходит два десятка, и один пропущенный не стоит того,
  // чтобы гадать, почему модель отказалась.
  if (res.stop_reason === 'refusal') {
    return { refused: res.stop_details?.category ?? 'без категории' }
  }
  return { data: res.parsed_output }
}

function adaptPrompt(item, ladder, lang) {
  const steps = ladder.levels
    .map((l, i) => `${i + 1}. ${l.level} — ${l.hint}`)
    .join('\n')
  return `Пересказать на ${ladder.name} языке, на ${ladder.levels.length} ступенях:

${steps}

Тему выбери из списка: ${TOPICS.join(', ')}.
minutes — примерное время чтения ступени в минутах.

ИСХОДНЫЙ МАТЕРИАЛ (${item.lang}, источник «${item.outletId}»):

Заголовок: ${item.title}

${item.body}`
}

function glossPrompt(lang, words, texts) {
  return `Ниже слова из текста на языке «${lang}», которых нет в словаре платформы. Дай перевод КАЖДОГО на русский.

Правила:
- term — слово ровно в той форме, в какой оно дано ниже; ничего не меняй и не добавляй.
- ru — короткий перевод, одно-три слова или короткая фраза. Без пояснений в скобках.
- note — пометка, если она нужна: часть речи, форма слова, оговорка о значении. Не нужна — пустая строка.
- Перевод давай ДЛЯ ЭТОГО КОНТЕКСТА: слово многозначно, а нужен смысл, в котором оно стоит в тексте.

СЛОВА: ${words.join(', ')}

ТЕКСТ, В КОТОРОМ ОНИ СТОЯТ:
${texts}`
}

// ─── Сборка одного материала ─────────────────────────────────────────────────

async function adapt(item, lang, ladder, glossSoFar) {
  const said = await ask('adapt', Adaptation, adaptPrompt(item, ladder, lang))
  if (said.refused) return { skip: `модель отказалась (${said.refused})` }
  const a = said.data
  if (!a || !a.levels?.length) return { skip: 'пустой пересказ — материал не подошёл' }

  const all = `${a.title}\n${a.levels.map(l => l.body).join('\n')}`
  let extra = glossSoFar

  // Первая проверка. Дыры почти всегда есть — текст новый, и термины в нём
  // новые; на то второй запрос и нужен.
  let gaps = holes(lang, all, extra)
  if (gaps.length) {
    const said2 = await ask('gloss', Glossary, glossPrompt(lang, gaps, all))
    if (said2.refused) return { skip: `словарь: модель отказалась (${said2.refused})` }
    const fresh = (said2.data?.words ?? [])
      .filter(w => w.term?.trim() && w.ru?.trim())
      .map(w => ({ term: w.term.trim(), ru: w.ru.trim(), note: w.note?.trim() || undefined }))
    extra = [...extra, ...fresh]
    gaps = holes(lang, all, extra)
  }

  // Вторая проверка — та, ради которой всё. Не покрыли — не берём.
  if (gaps.length) {
    return { skip: `${gaps.length} слов без перевода: ${gaps.slice(0, 6).join(' ')}` }
  }

  const first = a.levels[0]
  return {
    item: {
      id: `adapt-${item.id}`,
      outletId: ladder.outlet,
      lang,
      title: a.title,
      date: item.date,
      lane: 'free',
      textOrigin: 'ours',
      age: '12+',
      url: item.url,
      byline: `по материалу ${item.outletId}`,
      origin: 'original',
      level: first.level,
      minutes: first.minutes,
      topic: a.topic,
      skill: 'Чтение',
      body: first.body,
      levels: a.levels,
    },
    gloss: extra,
  }
}

// ─── Запись ──────────────────────────────────────────────────────────────────

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const tpl = s => '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'

function emitFeed(lang, ladder, items) {
  const head = `// ─────────────────────────────────────────────────────────────────────────────
// ПЕРЕСКАЗЫ ПО УРОВНЯМ. НЕ ПРАВИТЬ РУКАМИ.
//
// Файл целиком пишет \`npm run adapt:feed\`. Любая правка здесь исчезнет на
// ближайшем прогоне; материалы, написанные человеком, лежат в feed${ladder.file.slice(5, 7)}.ts,
// который скрипт не трогает.
//
// Что это. Научная новость, рассказанная нами на нескольких уровнях сразу, —
// чтобы тема была доступна не только тому, кто уже дочитался до газетного
// языка. Исходники берутся только оттуда, где переработка разрешена;
// \`byline\` называет исходный материал.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeedItem } from './index'

export const ${ladder.konst}: FeedItem[] = [
`
  const body = items.map(it => {
    const lines = [
      `    id: ${q(it.id)},`,
      `    outletId: ${q(it.outletId)},`,
      `    lang: ${q(it.lang)},`,
      `    title: ${q(it.title)},`,
      `    date: ${q(it.date)},`,
      `    lane: 'free',`,
      `    textOrigin: 'ours',`,
      `    age: '12+',`,
      `    url: ${q(it.url)},`,
      `    byline: ${q(it.byline)},`,
      `    origin: 'original',`,
      `    level: ${q(it.level)},`,
      `    minutes: ${it.minutes},`,
      `    topic: ${q(it.topic)},`,
      `    skill: 'Чтение',`,
      `    body: ${tpl(it.body)},`,
      `    levels: [`,
      ...it.levels.map(l => `      { level: ${q(l.level)}, minutes: ${l.minutes}, body: ${tpl(l.body)} },`),
      `    ],`,
      `    glossary: [],`,
      `    questions: [],`,
    ]
    return `  {\n${lines.join('\n')}\n  },`
  }).join('\n')
  writeFileSync(join(dataDir, 'feed', ladder.file), head + body + '\n]\n', 'utf8')
}

function emitGloss(byLang) {
  const head = `// ─────────────────────────────────────────────────────────────────────────────
// СЛОВАРЬ К ПЕРЕСКАЗАМ. НЕ ПРАВИТЬ РУКАМИ.
//
// Файл целиком пишет \`npm run adapt:feed\`: сочинив пересказ, конвейер тут же
// выписывает КАЖДОЕ слово этого текста, которого ещё нет в словаре тапа. Иначе
// свежий текст ломал бы главную гарантию чтения — «ткни в любое слово и получи
// перевод», — и ломал бы молча.
//
// ПРИОРИТЕТ НИЖЕ РУЧНОГО. В wordGloss.ts записи складываются так: слова курсов,
// потом эти, потом написанные человеком. Значит, ручная запись всегда бьёт
// машинную, и поправить машинный перевод можно обычной записью в wordGloss.ts —
// ночной прогон её не затрёт.
// ─────────────────────────────────────────────────────────────────────────────

import type { WordGloss } from './wordGloss'

export const AUTO_GLOSS: Record<string, WordGloss[]> = {
`
  const body = Object.entries(byLang)
    .filter(([, ws]) => ws.length)
    .map(([lang, ws]) => `  ${q(lang)}: [\n${ws
      .map(w => `    { term: ${q(w.term)}, ru: ${q(w.ru)}${w.note ? `, note: ${q(w.note)}` : ''} },`)
      .join('\n')}\n  ],`)
    .join('\n')
  writeFileSync(join(dataDir, 'wordGlossAuto.ts'), head + body + '\n}\n', 'utf8')
}

// ─── Прогон ──────────────────────────────────────────────────────────────────

const langs = ONLY ? [ONLY] : Object.keys(LADDERS)
const outFeed = {}
const outGloss = { ...M.AUTO_GLOSS }

for (const lang of langs) {
  const ladder = LADDERS[lang]
  if (!ladder) { console.log(`✕ язык «${lang}» не настроен`); continue }

  const done = new Set((EXISTING[lang] ?? []).map(i => i.id))
  // 150 знаков — нижняя граница «есть что пересказывать», и она подобрана по
  // фактическим длинам: заметка NASA бывает на 1200 знаков, а лид корейского
  // пресс-релиза — на 166. Фактов в лиде на два абзаца простого текста
  // хватает; всё, что короче 150, — это заголовок с датой и ничего больше.
  const fresh = POOL
    .filter(it => ALLOWED.has(it.outletId) && (it.body ?? '').length > 150)
    .filter(it => !done.has(`adapt-${it.id}`))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  // ПО ОДНОМУ С ИСТОЧНИКА ЗА КРУГ. Без этого весь прогон уходит на NASA:
  // у неё и заметок больше, и они длиннее, а лента из трёх пересказов подряд
  // про один телескоп — это не «наука каждый день».
  const byOutlet = new Map()
  for (const it of fresh) {
    if (!byOutlet.has(it.outletId)) byOutlet.set(it.outletId, [])
    byOutlet.get(it.outletId).push(it)
  }
  const candidates = []
  for (let round = 0; candidates.length < fresh.length; round++) {
    let added = false
    for (const list of byOutlet.values()) {
      if (list[round]) { candidates.push(list[round]); added = true }
    }
    if (!added) break
  }

  console.log(`\n${ladder.name} — кандидатов ${candidates.length}, берём до ${LIMIT}`)
  if (PLAN) {
    for (const it of candidates.slice(0, LIMIT)) console.log(`  · ${it.outletId} — ${it.title.slice(0, 62)}`)
    outFeed[lang] = EXISTING[lang] ?? []
    continue
  }

  const made = []
  for (const it of candidates) {
    if (made.length >= LIMIT) break
    const res = await adapt(it, lang, ladder, outGloss[lang] ?? [])
    if (res.skip) { console.log(`  ✕ ${it.title.slice(0, 48)}… — ${res.skip}`); continue }
    outGloss[lang] = res.gloss
    made.push(res.item)
    console.log(`  ✓ ${res.item.title.slice(0, 52)} · ${res.item.levels.map(l => l.level).join(' / ')}`)
  }

  // Свежие вперёд, потолок на язык. Порядок по дате исходной новости: пересказ
  // вчерашнего релиза — вчерашняя новость, а не сегодняшняя.
  outFeed[lang] = [...made, ...(EXISTING[lang] ?? [])]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, KEEP)
}

if (!WRITE) {
  console.log('\nНичего не записано. Прогнать с --write.')
} else {
  for (const [lang, items] of Object.entries(outFeed)) {
    emitFeed(lang, LADDERS[lang], items)
    console.log(`${LADDERS[lang].file.padEnd(12)} материалов ${items.length}`)
  }
  emitGloss(outGloss)
  const total = Object.values(outGloss).reduce((n, ws) => n + ws.length, 0)
  console.log(`wordGlossAuto.ts  слов ${total}`)
  console.log('\nДальше: npm run check:gloss && node scripts/checkFeed.mjs --fix')
}

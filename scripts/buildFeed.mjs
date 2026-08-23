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
//   node scripts/buildFeed.mjs --outlet samsung-kr
//                                              — заготовки под свои тексты
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
/**
 * Сколько материалов держим в автоленте на язык.
 *
 * Сорок — это примерно две недели листания и около 50 КБ в чанке языка. Меньше
 * — лента кончается за один вечер; больше — чанк начинает весить как сцены, а
 * читать позавчерашние новости всё равно никто не станет.
 */
const KEEP = Number(flag('keep', 40))

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
  // The Conversation — академическая журналистика под CC BY-ND: они САМИ просят
  // перепечатывать («Republish our articles for free»). Для ленты это находка:
  // объёмный живой поток текстов обо всём, от сейсмологии до истории, и всё
  // законно целиком.
  'the-conversation': {
    lang: 'en', name: 'The Conversation', kind: 'atom', lane: 'free', level: 'B2',
    topic: 'Учёба',
    url: 'https://theconversation.com/us/articles.atom',
  },
  esa: {
    lang: 'en', name: 'ESA', kind: 'rss', lane: 'free', level: 'B2',
    topic: 'Технологии и медиа',
    url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Science',
  },
  noaa: {
    lang: 'en', name: 'NOAA', kind: 'rss', lane: 'free', level: 'B1',
    topic: 'Погода и природа',
    url: 'https://www.noaa.gov/rss.xml',
  },

  // Каналы. Встраивание — штатная функция площадки, поэтому источников тут
  // может быть сколько угодно: это единственная дорожка, которая масштабируется
  // без нашего письма.
  'cnn-yt': {
    lang: 'en', name: 'CNN', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Технологии и медиа', channel: 'UCupvZG-5ko_eiXAupbDfxWw',
  },
  'bbc-yt': {
    lang: 'en', name: 'BBC News', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Технологии и медиа', channel: 'UC16niRr50-MSBwiO3YDb3RA',
  },
  natgeo: {
    lang: 'en', name: 'National Geographic', kind: 'youtube', lane: 'embed', level: 'B1',
    topic: 'Погода и природа', channel: 'UCpVm7bg6pXKo1Pr6k5kxG9A',
  },
  'ted-ed': {
    lang: 'en', name: 'TED-Ed', kind: 'youtube', lane: 'embed', level: 'B1',
    topic: 'Учёба', channel: 'UCsooa4yRKGN_zEE8iknghZA',
  },
  kurzgesagt: {
    lang: 'en', name: 'Kurzgesagt', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Учёба', channel: 'UCsXVk37bltHxD1rDPwtNM8Q',
  },
  veritasium: {
    lang: 'en', name: 'Veritasium', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Учёба', channel: 'UCHnyfMqiRRG1u-2MsSQLbXA',
  },
  vox: {
    lang: 'en', name: 'Vox', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Технологии и медиа', channel: 'UCLXo7UDZvByw2ixzpQCufnA',
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
  // ЖИВЫЕ ЛЮДИ, А НЕ ДИКТОРЫ. Выпуск новостей даёт правильную, но неживую речь:
  // диктор не запинается, не сокращает и не шутит. Ниже — каналы, где корейцы
  // говорят так, как говорят: стрим, разговорный ролик, варьете. Именно этой
  // половины языка нет ни в учебнике, ни в новостях.
  chimchakman: {
    lang: 'ko', name: '침착맨', kind: 'youtube', lane: 'embed', level: 'TOPIK 5급',
    topic: 'Знакомство', channel: 'UCUj6rrhMTR9pipbAWBAMvUQ',
  },
  'korean-englishman': {
    lang: 'ko', name: '영국남자', kind: 'youtube', lane: 'embed', level: 'TOPIK 3급',
    topic: 'Еда', channel: 'UCg-p3lQIqmhh7gHpyaOmOiQ',
  },
  syuka: {
    lang: 'ko', name: '슈카월드', kind: 'youtube', lane: 'embed', level: 'TOPIK 5급',
    topic: 'Покупки и деньги', channel: 'UCsJ6RuBiTVWRX156FVbeaGg',
  },
  'mbc-ent': {
    lang: 'ko', name: 'MBC 예능', kind: 'youtube', lane: 'embed', level: 'TOPIK 4급',
    topic: 'Технологии и медиа', channel: 'UCiBr0bK06imaMbLc8sAEz0A',
  },
  'kbs-world': {
    lang: 'ko', name: 'KBS WORLD TV', kind: 'youtube', lane: 'embed', level: 'TOPIK 3급',
    topic: 'Путешествия', channel: 'UC5BMQOsAB8hKUyHu9KI6yig',
  },

  // ТЕКСТ ПО-КОРЕЙСКИ, А НЕ ШЕСТЬ РОЛИКОВ ПОДРЯД. До этих двух источников вся
  // корейская лента была видео: живых корейских текстов со свободной лицензией
  // в фидах попросту нет — Викиновости закрыты, у прессы лицензии нет, а
  // государственные RSS отдают заголовок без текста. KOGL закрывает дыру:
  // 정책브리핑 пишет ведомственные новости обычным газетным языком и отдаёт их
  // под первым типом лицензии.
  //
  // Разделов взято ДВА, и не ради количества. «Общество» — это школа,
  // транспорт, жильё, здоровье: то, о чём в Корее говорят каждый день.
  // «Культура» — выставки, парки, фестивали, туризм. Экономику не берём: там
  // язык отчёта, а не язык жизни, и половину заметок съедает стоп-список.
  'korea-kr-society': {
    lang: 'ko', name: '정책브리핑 · 사회', kind: 'kogl', lane: 'free', level: 'TOPIK 4급',
    topic: 'Дом и город',
    url: 'https://www.korea.kr/news/policyNewsList.do?smenu=EDS02',
  },
  'korea-kr-culture': {
    lang: 'ko', name: '정책브리핑 · 문화', kind: 'kogl', lane: 'free', level: 'TOPIK 4급',
    topic: 'Путешествия',
    url: 'https://www.korea.kr/news/policyNewsList.do?smenu=EDS03',
  },

  'ann-news': {
    lang: 'ja', name: 'ANNニュース', kind: 'youtube', lane: 'embed', level: 'JLPT N2',
    topic: 'Технологии и медиа',
    channel: 'UCGCZAYq5Xxojl_tSXcVJhiQ',
  },
  // Японский: те же роли, что у корейского набора. Двуязычный канал для входа,
  // новости для дикции, влог и варьете для того, как говорят на самом деле.
  'kevins-room': {
    lang: 'ja', name: "Kevin's English Room", kind: 'youtube', lane: 'embed', level: 'JLPT N3',
    topic: 'Знакомство', channel: 'UCFbp2XdRpKfk7mYt_uT8dxw',
  },
  'tbs-news': {
    lang: 'ja', name: 'TBS NEWS DIG', kind: 'youtube', lane: 'embed', level: 'JLPT N2',
    topic: 'Технологии и медиа', channel: 'UC6AG81pAkf6Lbi_1VC5NmPA',
  },
  hikakin: {
    lang: 'ja', name: 'HikakinTV', kind: 'youtube', lane: 'embed', level: 'JLPT N3',
    topic: 'Дом и город', channel: 'UCZf__ehlCEBPop-_sldpBUQ',
  },
  'tokai-onair': {
    lang: 'ja', name: '東海オンエア', kind: 'youtube', lane: 'embed', level: 'JLPT N2',
    topic: 'Путешествия', channel: 'UCutJqz56653xV2wwSvut_hQ',
  },
  quizknock: {
    lang: 'ja', name: 'QuizKnock', kind: 'youtube', lane: 'embed', level: 'JLPT N2',
    topic: 'Учёба', channel: 'UCQ_MqAw18jFTlBB-f8BP7dw',
  },

  ted: {
    lang: 'en', name: 'TEDx Talks', kind: 'youtube', lane: 'embed', level: 'B2',
    topic: 'Технологии и медиа',
    channel: 'UCAuUUnT6oDeKwE6v1NGQxug',
  },
  // ЗАГОТОВКИ, А НЕ МАТЕРИАЛЫ. У ньюсрума Samsung лицензии на перепечатку нет,
  // поэтому автоматически из него взять нечего: их текст показывать нельзя, а
  // свой машина не напишет. Зато скрипт может НАКРЫТЬ СТОЛ — принести
  // заголовок, краткое содержание и ссылку, чтобы человеку осталось только
  // написать текст под уровень. Это и есть `drafts`: в автоленту источник не
  // попадает никогда, но по `--outlet samsung-kr` кладёт заготовки в staging.
  'samsung-kr': {
    lang: 'ko', name: 'Samsung Newsroom', kind: 'rss', lane: 'link', level: 'TOPIK 4급',
    topic: 'Работа', drafts: true,
    url: 'https://news.samsung.com/kr/feed',
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
  // ПОЛИТИКА. Не потому, что тема запретная, а потому, что это лента у
  // школьника, и разбирать на ней предвыборную перепалку чужой страны — не то,
  // ради чего он учит язык. Без этих слов у CNN и Vox в ленту приехали
  // «Why won’t Republicans say Biden won» и «Is being a Black conservative its
  // own form of DEI» — темы, на которых взрослые ссорятся, а не язык учат.
  'republican', 'democrat', 'trump', 'biden', 'election', 'senate', 'congress',
  'abortion', 'immigration', 'deport', 'lawsuit', 'sues', 'indicted', 'impeach',
  'protest', 'racism', 'racist', 'shutdown', 'tariff',
  'dei', 'conservative', 'liberal', 'woke',
  // Катастрофы и происшествия по-английски: до этого в ленту приехали «9/11
  // Reunited», «crash driver who cost him his leg» и мальчик, брошенный отцом
  // на Фудзи. Формально ни одного стоп-слова из первой строки там нет.
  'crash', 'injured', 'injury', 'stranded', 'hijack', 'pentagon', '9/11',
  'lawsuit', 'trial', 'verdict', 'arrested', 'police',
  '전쟁', '사망', '사망자', '숨졌', '공격', '테러', '살해', '폭탄', '시신', '체포', '실종', '마약', '흉기',
  // Суд, следствие и политика: формально не «происшествие», но и не то, что
  // нужно ученику в ленте. Проверено на выдаче SBS — без этих слов туда
  // приезжали приговоры, обыски и предвыборная перепалка.
  '성범죄', '무죄', '유죄', '재판', '판결', '항소심', '검찰', '경찰', '소송', '피고', '구속', '수사',
  '대통령', '의원', '선거', '자살', '사고', '부상',
  // Общественная перепалка: «세제개편안 … 반발» приехало в ленту как обычная
  // новость. Формально не происшествие, но обсуждать налоговую реформу на
  // корейском школьнику незачем.
  '반발', '논란', '시위', '규탄', '세제', '개편안', '갈등',
  // Стихия и её последствия. С государственных заметок в ленту поехали
  // «호우 피해», «이재민», «중앙재난안전대책본부» — это ровно то же самое, что
  // сводка происшествий, только написанная канцелярски.
  '이재민', '침수', '산불', '호우', '폭우', '태풍', '지진', '재난',
  '戦争', '死亡', '死者', '攻撃', 'テロ', '殺害', '殺人', '爆弾', '遺体', '逮捕', '失踪', '事件',
  '提訴', '裁判', '判決', '容疑', '起訴', '捜査', '自殺', '事故', 'けが', '負傷', '被害',
  // Стихия по-японски — теми же словами, что и по-корейски строкой выше.
  // Без них в ленту приехали «関東で震度5弱 24人重軽傷» и три сюжета о 豪雨:
  // формально это не криминал, а сводка бедствия, и читать её в ленте у
  // школьника незачем. 大雨 и 台風 отсеивают заодно и штормовые предупреждения
  // — прогноз погоды бывает и без них.
  '豪雨', '大雨', '台風', '地震', '震度', '冠水', '浸水', '水没', '土砂', '避難', '停電', '山火事',
]

// Латиница ищется ПО ЦЕЛОМУ СЛОВУ, иероглифы — подстрокой.
//
// Обе половины этого правила выстраданы. Без границы слова «war» находится в
// «Award», и отсев съедает половину NASA. С границей только слева «war» ловит
// «warming», а «dead» — «deadline», и из ленты пропадают статьи про климат и
// про сроки. Поэтому формы перечислены явно: лучше длинный список, чем
// регулярка, которая думает, будто знает английскую морфологию.
const FORMS = {
  war: ['war', 'wars', 'warfare'],
  killed: ['killed', 'killing', 'killings', 'kills'],
  death: ['death', 'deaths'],
  dead: ['dead', 'deadly'],
  attack: ['attack', 'attacks', 'attacked'],
  strike: ['strike', 'strikes', 'airstrike', 'airstrikes'],
  shooting: ['shooting', 'shootings', 'shooter'],
  murder: ['murder', 'murders', 'murdered'],
  assault: ['assault', 'assaults'],
  wounded: ['wounded', 'wounds'],
  bomb: ['bomb', 'bombs', 'bombing'],
  casualt: ['casualty', 'casualties'],
  invasion: ['invasion', 'invade', 'invaded'],
  troops: ['troops'],
  missile: ['missile', 'missiles'],
  terror: ['terror', 'terrorist', 'terrorism'],
  execution: ['execution', 'executed'],
  morto: ['morto', 'mortos', 'morta'],
  morte: ['morte', 'mortes'],
  guerra: ['guerra', 'guerras'],
  ataque: ['ataque', 'ataques'],
  assassin: ['assassinato', 'assassinado'],
  tiroteio: ['tiroteio'],
  'vítima': ['vítima', 'vítimas'],
  republican: ['republican', 'republicans', 'gop'],
  democrat: ['democrat', 'democrats', 'democratic'],
  election: ['election', 'elections', 'electoral'],
  immigration: ['immigration', 'immigrant', 'immigrants'],
  deport: ['deport', 'deported', 'deportation'],
  lawsuit: ['lawsuit', 'lawsuits'],
  sues: ['sues', 'sued', 'suing'],
  protest: ['protest', 'protests', 'protesters'],
  racism: ['racism'],
  racist: ['racist', 'racists'],
  tariff: ['tariff', 'tariffs'],
  senate: ['senate', 'senator', 'senators'],
  dei: ['dei'],
  conservative: ['conservative', 'conservatives'],
  liberal: ['liberal', 'liberals'],
  crash: ['crash', 'crashed', 'crashes'],
  injured: ['injured'],
  injury: ['injury', 'injuries'],
  stranded: ['stranded'],
  hijack: ['hijack', 'hijacked', 'hijacking'],
  trial: ['trial'],
  verdict: ['verdict'],
  arrested: ['arrested', 'arrest', 'arrests'],
  police: ['police'],
  congress: ['congress', 'congressional'],
}

const STOP_RE = STOP.map(w => {
  if (!/^[\x20-\x7e\u00c0-\u024f]+$/.test(w)) return null
  const forms = FORMS[w] ?? [w]
  return new RegExp(`\\b(${forms.join('|')})\\b`, 'i')
})

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

/**
 * Atom. Отдельно от RSS не для красоты: у атома запись — <entry>, ссылка живёт
 * в атрибуте <link href>, а текст — в <content type="html">. Разбирать это
 * теми же регулярками, что RSS, значит получить пустые ссылки и не заметить.
 */
async function fromAtom(id, src) {
  const xml = await get(src.url)
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const out = []

  for (const e of entries) {
    if (out.length >= LIMIT) break
    const title = strip(tag(e, 'title'))
    const link = (e.match(/<link[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
    const published = (e.match(/<published>(.*?)<\/published>/) ?? [])[1] ?? ''
    const content = tag(e, 'content')
    const author = strip(tag(e, 'name'))

    const paras = paragraphs(unescape(content))
      // У The Conversation первый блок — подпись под фотографией с указанием
      // фотобанка. Это не текст статьи, и в ленте он читается как начало.
      .filter(p => !/^\s*(Photo|Image|Credit|Shutterstock|Getty)/i.test(p))
    if (!title || !link || paras.length === 0) continue

    const hit = stopped(`${title} ${paras.join(' ')}`)
    if (hit) { console.log(`  ✕ «${title.slice(0, 48)}…» — стоп-слово «${hit}»`); continue }

    out.push({
      outletId: id, lang: src.lang, lane: src.lane, level: src.level, topic: src.topic,
      title, url: link, date: isoDate(published), byline: author || undefined,
      text: paras.slice(0, 3).join('\n\n'),
    })
  }
  return out
}

/**
 * KOGL — 공공누리, корейская государственная лицензия. Первый тип
 * («출처표시») разрешает любое использование с указанием источника: это
 * единственная корейская дорожка, где текст можно показать целиком, а не
 * пересказать.
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНЫЙ АДАПТЕР, А НЕ ЕЩЁ ОДИН RSS. Проверено 23.08.2026: RSS у
 * 정책브리핑 отключён совсем (korea.kr/etc/rss.do отдаёт объявление о
 * прекращении услуги), а те министерские фиды, что живы, отдают ОДИН
 * ЗАГОЛОВОК — ни описания, ни текста. Читать в ленте там нечего. Поэтому
 * список берём со страницы раздела, а текст — со страницы заметки.
 *
 * ЛИЦЕНЗИЮ ПРОВЕРЯЕМ У КАЖДОЙ ЗАМЕТКИ, а не у раздела. В тех же списках рядом
 * с материалами ведомств лежат колонки и репортажи сторонних редакций, у
 * которых KOGL нет: у них внизу стоит чужой копирайт. Нет на странице метки
 * первого типа — материал не берём, и это не перестраховка: без неё в ленту
 * первым же прогоном приехал репортаж с фотографиями C영상미디어.
 *
 * ФОТОГРАФИИ НЕ БЕРЁМ НИКОГДА. Лицензия покрывает ТОЛЬКО ТЕКСТ — это написано
 * на самой странице: «단, 텍스트를 제외한 사진·이미지…». Подписи под снимками
 * приходят внутри текста заметки, поэтому их вырезаем отдельно.
 */
const koglSeen = new Set()

async function fromKogl(id, src) {
  const list = await get(src.url)

  // ТОЛЬКО САМ РАЗДЕЛ. На странице раздела, кроме его списка, есть блоки
  // «читают сейчас» и подборки — они одинаковые во всех разделах, и без
  // отсечения «культура» и «общество» приезжают наполовину одинаковыми.
  // Список лежит между `list_type` и постраничной навигацией.
  const from = list.indexOf('class="list_type"')
  const to = list.indexOf('paging', from)
  const section = from < 0 ? list : list.slice(from, to > 0 ? to : undefined)

  const newsIds = []
  for (const m of section.matchAll(/policyNewsView\.do\?newsId=(\d+)/g)) {
    if (!newsIds.includes(m[1])) newsIds.push(m[1])
  }

  // Подпись под фотографией, копирайт фотобанка и служебный хвост заметки.
  // Всё это лежит в тексте абзацами и без отсева читается как часть новости.
  const SERVICE = /\(사진=|사진 제공|사진=|저작권자|무단 전재|무단전재|재배포 금지|^문의\s*[:：]|정책브리핑.{0,24}자료는|공공누리/

  const out = []
  for (const newsId of newsIds) {
    if (out.length >= LIMIT) break

    // Заметку дня закрепляют сразу в нескольких разделах: без общей памяти
    // один и тот же текст приедет в ленту дважды под разными подписями.
    if (koglSeen.has(newsId)) continue
    koglSeen.add(newsId)

    const url = `https://www.korea.kr/news/policyNewsView.do?newsId=${newsId}`
    const page = await get(url)

    if (!page.includes('공공누리 제1유형')) {
      console.log(`  ✕ ${newsId} — нет метки 공공누리 제1유형, текст чужой`)
      continue
    }

    const title = strip((page.match(/<meta property="og:title" content="([^"]*)"/) ?? [])[1] ?? '')
    const dept = strip((page.match(/<a class="gotosite"[^>]*>([\s\S]*?)<i /) ?? [])[1] ?? '')
    const day = (page.match(/<div class="info">[\s\S]{0,200}?<span>\s*(\d{4})\.(\d{2})\.(\d{2})/) ?? [])
    const date = day.length ? `${day[1]}-${day[2]}-${day[3]}` : new Date().toISOString().slice(0, 10)

    const bodyHtml = ((page.match(/<div class="article_body">([\s\S]*?)<div class="article_footer"/) ?? [])[1] ?? '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
    const paras = paragraphs(bodyHtml).filter(p => !SERVICE.test(p))
    if (!title || paras.length === 0) {
      console.log(`  ✕ ${newsId} — на странице не нашлось текста`)
      continue
    }

    const hit = stopped(`${title} ${paras.join(' ')}`)
    if (hit) { console.log(`  ✕ «${title.slice(0, 48)}…» — стоп-слово «${hit}»`); continue }

    out.push({
      outletId: id, lang: src.lang, lane: src.lane, level: src.level, topic: src.topic,
      title, url, date,
      // Атрибуция у KOGL — условие лицензии. Ведомство, выпустившее заметку,
      // указано на странице; сам сайт подписан названием источника на карточке.
      byline: dept || src.byline || undefined,
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

const ids = ONLY ? [ONLY] : Object.keys(SOURCES).filter(id => !SOURCES[id].archive && !SOURCES[id].drafts)
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
      : src.kind === 'atom' ? await fromAtom(id, src)
      : src.kind === 'kogl' ? await fromKogl(id, src)
      : await fromRss(id, src)

    const langKey = base(src.lang)
    for (const it of raw) {
      if (src.drafts) {
        // Заготовке нужен не словарь, а место на столе: краткое содержание
        // целиком, чтобы по нему писать, и пустые поля под наш текст.
        mkdirSync(stageDir, { recursive: true })
        const draft = {
          draft: true,
          outletId: id, lang: it.lang, lane: 'link', textOrigin: 'ours',
          title: it.title, url: it.url, date: it.date,
          level: src.level, topic: src.topic,
          факты: it.text,
          body: '', translation: '', glossary: [],
        }
        writeFileSync(join(stageDir, `draft-${idFor(id, it.url)}.json`), JSON.stringify(draft, null, 2) + '\n', 'utf8')
        console.log(`  ✎ ${it.date}  заготовка  ${it.title.slice(0, 56)}`)
        continue
      }
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
    // СТОП-СПИСОК ПРИМЕНЯЕТСЯ И К СТАРОМУ. Он пополняется тогда, когда в ленту
    // уже что-то приехало: пока правило действует только на свежее, заметка,
    // ради которой слово и добавили, остаётся в файле навсегда.
    const hit = stopped(m[1])
    if (id && hit) {
      console.log(`  ✕ убрано из ленты: ${id} — стоп-слово «${hit}»`)
      continue
    }
    if (id && !keptIds.has(id)) {
      kept.push({
        raw: m[0],
        date: (m[1].match(/date: '([^']+)'/) ?? [])[1] ?? '',
        outlet: (m[1].match(/outletId: '([^']+)'/) ?? [])[1] ?? '',
        url: (m[1].match(/url: '([^']+)'/) ?? [])[1] ?? '',
      })
    }
  }

  // ПОТОЛОК НА ИСТОЧНИК. Варьете выкладывает шесть нарезок одной серии подряд,
  // и без ограничения половина корейской ленты — это «전지적 참견 시점» шесть
  // раз. Лента должна быть разной, а не полной: четыре материала от одного
  // канала — это уже много.
  const perOutlet = new Map()
  const capped = []
  const pool = [
    ...fresh.map(x => ({ item: x, date: x.date, outlet: x.outletId, url: x.url })),
    ...kept.map(x => ({ raw: x.raw, date: x.date, outlet: x.outlet, url: x.url })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  // Потолок считается от того, сколько источников у языка вообще есть. У
  // английского их двенадцать — четырёх материалов с каждого хватает на полную
  // ленту. У японского источника два, и жёсткая четвёрка оставила бы восемь
  // материалов вместо сорока: там ограничивать нечего.
  const outlets = new Set(pool.map(x => x.outlet)).size || 1
  const CAP = Math.max(4, Math.ceil(KEEP / outlets))

  // ОДИН МАТЕРИАЛ — ОДНА КАРТОЧКА. id считается от источника и ссылки, поэтому
  // заметку, закреплённую сразу в двух разделах одного сайта, он развести не
  // может: id разные, материал один. Ученику это видно как одно и то же,
  // напечатанное дважды подряд, поэтому дубли снимаем по ССЫЛКЕ.
  const seenUrls = new Set()
  for (const x of pool) {
    if (x.url && seenUrls.has(x.url)) continue
    if (x.url) seenUrls.add(x.url)
    const n = perOutlet.get(x.outlet) ?? 0
    if (n >= CAP) continue
    perOutlet.set(x.outlet, n + 1)
    capped.push(x)
  }
  const merged = capped.slice(0, KEEP)

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

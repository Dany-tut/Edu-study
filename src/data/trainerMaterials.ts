// ─────────────────────────────────────────────────────────────────────────────
// Реестр материалов тренажёра — всё, что ученик может открыть, одним списком
//
// ЗАЧЕМ. У ученика в тренажёре семь режимов и полторы тысячи материалов, а у
// учителя во вкладке «Материалы» до сих пор был ровно один источник — свои
// подборки карточек. На вопрос «где остальное» интерфейс не отвечал никак:
// тексты, разговорник, справочник форм и рассказ о языке лежат в src/data и
// видны только из репозитория. Кабинет, который не показывает половину
// собственного содержимого, заставляет учителя верить на слово.
//
// ЧТО ЭТО РЕШАЕТ, А ЧТО НЕТ. Реестр даёт ВИДИМОСТЬ: перечислить, пересчитать,
// отфильтровать, открыть и прочитать. Правку он не даёт — материал из кода
// правится кодом, и делать вид, что поле ввода над константой что-то сохранит,
// нельзя. Поэтому у семьи есть честный признак `editable`, и он сегодня
// поднят только у подборок.
//
// ВСЁ ГРУЗИТСЯ ЧАНКАМИ. Ни один из этих модулей не импортируется статически:
// сцены английского — 1,1 МБ, словарь — 616 КБ, и утащить их в чанк кабинета
// значило бы оплатить весь тренажёр на входе в «Финансы». `load()` у каждой
// семьи — динамический импорт, тот же, которым их берёт сам тренажёр, так что
// чанк переиспользуется, а не дублируется.
//
// СЕМЬИ СГРУППИРОВАНЫ ПО РЕЖИМАМ ТРЕНАЖЁРА, а не по устройству файлов: учитель
// ищет материал там же, где ученик его увидит. «Чтение» — это тексты, сцены и
// лента; «Карточки» — подборки, наборы слов, разговорник и гнёзда. Совпадение с
// рейлом ученика — не украшение, а единственный способ отвечать на вопрос «а
// что он там видит» не открывая его кабинет.
// ─────────────────────────────────────────────────────────────────────────────

/** Режимы рейла тренажёра — те же и в том же порядке, что видит ученик. */
export type MaterialMode = 'reading' | 'vocab' | 'listening' | 'speaking' | 'blocks' | 'grammar' | 'guide'

export const MATERIAL_MODES: { id: MaterialMode; label: string; hint: string }[] = [
  { id: 'reading',   label: 'Чтение',      hint: 'Тексты, сцены и лента' },
  { id: 'vocab',     label: 'Карточки',    hint: 'Подборки, наборы слов, разговорник' },
  { id: 'listening', label: 'Аудирование', hint: 'Записи и расшифровки' },
  { id: 'speaking',  label: 'Говорение',   hint: 'Что произносят вслух' },
  { id: 'blocks',    label: 'Конструктор', hint: 'Из чего собраны слова' },
  { id: 'grammar',   label: 'Грамматика',  hint: 'Справочник форм' },
  { id: 'guide',     label: 'О языке',     hint: 'Рассказ и полка учебников' },
]

/**
 * Материал в витрине — общий вид для текста, фразы, формы и главы.
 *
 * Поля намеренно бедные: витрине нужно опознать материал и отобрать его, а
 * читать его будут в просмотрщике. Всё богатство исходного типа остаётся в
 * `body` строкой — так одна плитка обслуживает четырнадцать разных источников,
 * не заводя четырнадцати компонентов.
 */
export interface MaterialItem {
  id: string
  title: string
  /** Подзаголовок плитки: о чём материал одной-двумя строками. */
  about: string
  /** Уровень строкой, как его заявляет сам материал: «A2», «TOPIK 1», «1급». */
  level?: string
  /** Раздел, тема или полка — второй фасет витрины. */
  topic?: string
  /** Объём: вопросов, фраз, слов. По нему идёт сортировка «По объёму». */
  size: number
  /** Подпись объёма в подвале плитки. */
  meta: string
  /** Материал целиком — то, что показывает просмотрщик. */
  body?: string
}

export interface MaterialFamily {
  id: string
  mode: MaterialMode
  label: string
  /** Одна строка: что это за материал и откуда он берётся. */
  hint: string
  /** Файл-источник — учителю он нужен, чтобы знать, куда идти за правкой. */
  source: string
  /**
   * Правится ли из кабинета. Сегодня — только подборки; остальное живёт в
   * коде, и признак честно об этом говорит вместо неработающей формы.
   */
  editable: boolean
  load(lang: string): Promise<MaterialItem[]>
}

/** «5 вопросов», «12 фраз» — счётный род берём из самой подписи. */
const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`
  return `${n} ${many}`
}

// ─── Чтение ──────────────────────────────────────────────────────────────────

const readingFamily: MaterialFamily = {
  id: 'texts', mode: 'reading', label: 'Тексты', source: 'src/data/readingLibrary.ts',
  hint: 'Учебные тексты с вопросами и словарём по клику.',
  editable: false,
  async load(lang) {
    const { textsForLang } = await import('./readingLibrary')
    return textsForLang(lang).map(x => ({
      id: x.id,
      title: x.title,
      about: x.body.slice(0, 200),
      level: x.level,
      topic: x.topic,
      size: x.questions.length,
      meta: `${plural(x.questions.length, 'вопрос', 'вопроса', 'вопросов')} · ${x.minutes} мин · ${plural(x.glossary.length, 'слово', 'слова', 'слов')}`,
      body: x.body,
    }))
  },
}

const scenesFamily: MaterialFamily = {
  id: 'scenes', mode: 'reading', label: 'Сцены', source: 'src/data/scenes/',
  hint: 'Подлинные отрывки из книг со свободной лицензией. Список произведений — без загрузки самих текстов.',
  editable: false,
  async load(lang) {
    // Берём РЕЕСТР произведений, а не сами сцены: у английского они весят 1,1 МБ,
    // и витрине для списка полок они не нужны ни строкой.
    const { worksForLang, workLine, sceneCount } = await import('./scenes')
    return worksForLang(lang).map(w => {
      const n = sceneCount(w.id)
      return {
        id: w.id,
        title: w.title,
        about: workLine(w),
        level: `${w.age} · ${w.medium}`,
        topic: w.shelf,
        size: n,
        meta: plural(n, 'сцена', 'сцены', 'сцен'),
      }
    })
  },
}

const feedFamily: MaterialFamily = {
  id: 'feed', mode: 'reading', label: 'Лента', source: 'src/data/feed/',
  hint: 'Новости и статьи из источников со свободной лицензией. Обновляется сборкой.',
  editable: false,
  async load(lang) {
    const { loadFeed, outletById } = await import('./feed')
    const list = await loadFeed(lang)
    return list.map(x => ({
      id: x.id,
      title: x.title,
      about: x.body.slice(0, 200),
      level: x.level,
      topic: outletById(x.outletId)?.name ?? x.outletId,
      size: x.body.length,
      meta: `${x.date} · ${x.minutes} мин`,
      body: x.body,
    }))
  },
}

// ─── Карточки ────────────────────────────────────────────────────────────────

const packsFamily: MaterialFamily = {
  id: 'packs', mode: 'vocab', label: 'Наборы слов', source: 'src/data/wordPacks*.ts',
  hint: 'Готовые пачки лексики, разложенные по полкам.',
  editable: false,
  async load(lang) {
    const { loadWordPacks } = await import('./wordPackBooks')
    const book = await loadWordPacks(lang)
    if (!book) return []
    return book.shelves.flatMap(shelf => shelf.packs.map(p => ({
      id: p.id,
      title: p.title,
      about: p.about ?? shelf.subtitle,
      level: p.level,
      topic: shelf.title,
      size: p.words.length,
      meta: plural(p.words.length, 'слово', 'слова', 'слов'),
      body: p.words.map(w => `${w.term} — ${w.ru}`).join('\n'),
    })))
  },
}

const phrasebookFamily: MaterialFamily = {
  id: 'phrasebook', mode: 'vocab', label: 'Разговорник', source: 'src/data/survival*.ts',
  hint: 'Разговорник выживания: сорок тем по ситуациям. Он же кормит «Говорение».',
  editable: false,
  async load(lang) {
    const { loadSurvivalBook } = await import('./survivalBooks')
    const { themesWithPhrases } = await import('./survivalPhrases')
    const book = await loadSurvivalBook(lang)
    return themesWithPhrases(book ?? undefined).map(x => ({
      id: x.theme.id,
      title: x.theme.title,
      about: x.theme.goal,
      level: x.theme.level,
      topic: `Тема ${x.theme.n}`,
      size: x.phrases.length,
      meta: plural(x.phrases.length, 'фраза', 'фразы', 'фраз'),
      body: x.phrases.map(p => `${p.term} — ${p.ru}${p.note ? `\n   ${p.note}` : ''}`).join('\n'),
    }))
  },
}

const nestsFamily: MaterialFamily = {
  id: 'nests', mode: 'vocab', label: 'Гнёзда созвучий', source: 'src/data/soundNests.ts',
  hint: 'Слова, которые путаются на слух: 물 · 불 · 뿔 · 풀.',
  editable: false,
  async load(lang) {
    const { nestsForLang, nestAxisLabel } = await import('./soundNests')
    return nestsForLang(lang).map(n => ({
      id: n.id,
      title: n.title,
      about: n.why,
      topic: nestAxisLabel(n.axis),
      size: n.words.length,
      meta: `${plural(n.words.length, 'слово', 'слова', 'слов')} · с юнита ${n.fromUnit}`,
      body: n.words.map(w => `${w.term} — ${w.ru}`).join('\n'),
    }))
  },
}

// ─── Аудирование ─────────────────────────────────────────────────────────────

const listeningFamily: MaterialFamily = {
  id: 'listening', mode: 'listening', label: 'Записи', source: 'src/data/listeningLibrary.ts',
  hint: 'Лекции и разговоры: расшифровка плюс вопросы.',
  editable: false,
  async load(lang) {
    const { listeningForLang } = await import('./listeningLibrary')
    return listeningForLang(lang).map(x => ({
      id: x.id,
      title: x.title,
      about: x.script?.slice(0, 200) ?? x.credit ?? '',
      level: x.level,
      topic: x.topic,
      size: x.questions.length,
      meta: `${plural(x.questions.length, 'вопрос', 'вопроса', 'вопросов')} · ${x.minutes} мин · ${x.videoUrl ? 'видео' : 'озвучка'}`,
      body: x.script,
    }))
  },
}

// ─── Говорение ───────────────────────────────────────────────────────────────

const speakingFamily: MaterialFamily = {
  id: 'speaking', mode: 'speaking', label: 'Что произносят', source: 'src/data/survival*.ts',
  hint: 'Собственного материала у режима нет: он берёт фразы разговорника и просит их произнести.',
  editable: false,
  async load(lang) {
    const items = await phrasebookFamily.load(lang)
    return items.map(x => ({ ...x, meta: `${x.meta} вслух` }))
  },
}

// ─── Конструктор ─────────────────────────────────────────────────────────────

const stemsFamily: MaterialFamily = {
  id: 'stems', mode: 'blocks', label: 'Основы и хвосты', source: 'src/data/koreanEndings.ts',
  hint: 'Одна основа глагола — восемь смыслов.',
  editable: false,
  async load(lang) {
    const { hasEndings, KO_VERBS, KO_ENDINGS } = await import('./koreanEndings')
    if (!hasEndings(lang)) return []
    return KO_VERBS.map(v => ({
      id: v.dict,
      title: `${v.dict} — ${v.ru}`,
      about: `Основа «${v.stem}», чтение ${v.reading}.`,
      size: Object.keys(v.forms).length,
      meta: plural(Object.keys(v.forms).length, 'форма', 'формы', 'форм'),
      body: KO_ENDINGS.map(e => `${e.id}: ${v.forms[e.id] ?? '—'}`).join('\n'),
    }))
  },
}

const rootsFamily: MaterialFamily = {
  id: 'roots', mode: 'blocks', label: 'Корни слов', source: 'src/data/koreanHanja.ts',
  hint: 'Корень-кирпич и слова, которые из него выводятся.',
  editable: false,
  async load(lang) {
    const { rootsForLang } = await import('./wordRoots')
    return rootsForLang(lang).map(r => ({
      id: `${r.cn}-${r.ko}`,
      title: `${r.cn} ${r.ko} — ${r.ru}`,
      about: r.words.map(w => w.term).join(' · '),
      topic: r.group,
      size: r.words.length,
      meta: plural(r.words.length, 'слово', 'слова', 'слов'),
      body: r.words.map(w => `${w.term} — ${w.ru}`).join('\n'),
    }))
  },
}

const numbersFamily: MaterialFamily = {
  id: 'numbers', mode: 'blocks', label: 'Числа', source: 'src/data/koreanNumbers.ts',
  hint: 'Два ряда счёта и что чем считают.',
  editable: false,
  async load(lang) {
    const { hasNumbers, KO_NUMBER_SETS, systemLabel } = await import('./koreanNumbers')
    if (!hasNumbers(lang)) return []
    return KO_NUMBER_SETS.map(s => ({
      id: s.id,
      title: s.title,
      about: s.when,
      topic: systemLabel(s.system),
      size: s.rows.length,
      meta: plural(s.rows.length, 'строка', 'строки', 'строк'),
      body: s.note,
    }))
  },
}

const soundsFamily: MaterialFamily = {
  id: 'sounds', mode: 'blocks', label: 'Правила чтения', source: 'src/data/koreanPronRules.ts',
  hint: 'Почему написанное звучит иначе.',
  editable: false,
  async load(lang) {
    const { hasPronRules, KO_PRON_RULES } = await import('./koreanPronRules')
    if (!hasPronRules(lang)) return []
    return KO_PRON_RULES.map(r => ({
      id: r.id,
      title: `${r.title} · ${r.ko}`,
      about: r.tagline,
      size: 1,
      meta: r.ko,
      body: r.why,
    }))
  },
}

// ─── Грамматика ──────────────────────────────────────────────────────────────

const grammarFamily: MaterialFamily = {
  id: 'grammar', mode: 'grammar', label: 'Формы', source: 'src/data/grammar/',
  hint: 'Справочник форм: не курс, а место, куда приходят с вопросом «чем 은/는 отличается от 이/가».',
  editable: false,
  async load(lang) {
    const { loadGrammarRef } = await import('./grammar')
    const ref = await loadGrammarRef(lang)
    if (!ref) return []
    return ref.forms.map(f => ({
      id: f.id,
      title: `${f.form} — ${f.title}`,
      about: f.short,
      level: f.level,
      topic: f.chapter,
      size: f.examples.length,
      meta: `${plural(f.examples.length, 'пример', 'примера', 'примеров')} · ${plural(f.quiz.length, 'вопрос', 'вопроса', 'вопросов')}`,
      body: f.rule,
    }))
  },
}

// ─── О языке ─────────────────────────────────────────────────────────────────

const storyFamily: MaterialFamily = {
  id: 'story', mode: 'guide', label: 'Рассказ', source: 'src/data/languageStory*.ts',
  hint: 'Почему язык такой: главы про устройство и историю.',
  editable: false,
  async load(lang) {
    const { loadStory } = await import('./languageGuides')
    const story = await loadStory(lang)
    if (!story) return []
    return story.chapters.map(c => ({
      id: c.id,
      title: c.title,
      about: c.about,
      size: c.cards.length,
      meta: plural(c.cards.length, 'карточка', 'карточки', 'карточек'),
    }))
  },
}

const booksFamily: MaterialFamily = {
  id: 'books', mode: 'guide', label: 'Учебники', source: 'src/data/textbooks.ts',
  hint: 'Полка учебников: по чему заниматься помимо курса.',
  editable: false,
  async load(lang) {
    const { textbooksForLang } = await import('./textbooks')
    return textbooksForLang(lang).map(b => ({
      id: b.id,
      title: b.short ?? b.title,
      about: [b.authors, b.publisher].filter(Boolean).join(' · '),
      level: b.level,
      topic: b.kind,
      size: 1,
      meta: `${b.kind} · ${b.free ? 'бесплатно' : 'платно'} · объясняет на ${b.explainedIn}`,
    }))
  },
}

/**
 * Все семьи, кроме подборок карточек.
 *
 * Подборки в реестре не лежат намеренно: они единственные приезжают из базы, у
 * них своя правка, свой редактор и своя адресность по ученикам — обобщать их до
 * «прочитать и посмотреть» значило бы потерять всё, ради чего они сделаны.
 */
export const MATERIAL_FAMILIES: MaterialFamily[] = [
  readingFamily, scenesFamily, feedFamily,
  packsFamily, phrasebookFamily, nestsFamily,
  listeningFamily,
  speakingFamily,
  stemsFamily, rootsFamily, numbersFamily, soundsFamily,
  grammarFamily,
  storyFamily, booksFamily,
]

export const familiesOfMode = (mode: MaterialMode) =>
  MATERIAL_FAMILIES.filter(f => f.mode === mode)

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
 * Кусок материала в просмотрщике.
 *
 * ПОЧЕМУ НЕ ОДНА СТРОКА. Первая версия отдавала просмотрщику единственное поле
 * `body`, и всё, что не проза, склеивалось в него через `\n`: пары «слово —
 * перевод», строки таблицы, примеры. Читалось это столбиком в треть экрана, а
 * половина материала не доезжала вовсе — карточка формы обещала «8 примеров ·
 * 2 вопроса» и показывала только объяснение. Подпись, которая называет то,
 * чего на странице нет, хуже отсутствующей подписи.
 *
 * Видов ровно четыре, и они покрывают все четырнадцать семей: проза, пары,
 * таблица и самопроверка. Пятый вид заводится тогда, когда материал
 * действительно не ложится ни в один из них, а не потому, что у семьи своё
 * название для того же самого.
 */
export type MaterialBlock =
  | { kind: 'text'; title?: string; text: string; tone?: 'warn' }
  /** Двуязычные строки: слово и перевод, фраза и перевод, форма и значение. */
  | { kind: 'pairs'; title?: string; rows: { term: string; ru: string; note?: string }[] }
  | { kind: 'table'; title?: string; head: string[]; rows: string[][] }
  /** Вопросы с отмеченным верным ответом: учитель видит и ключ, и объяснение. */
  | { kind: 'quiz'; title?: string; items: { q: string; options: string[]; answer: number; why?: string }[] }

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
  /** Проза материала: объяснение, текст, расшифровка. */
  body?: string
  /**
   * Всё остальное содержимое — примеры, словарь, таблицы, вопросы.
   *
   * Списком, а не полями: просмотрщик рисует блоки по порядку и ничего не знает
   * про то, из какой они семьи.
   */
  blocks?: MaterialBlock[]
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
   * Файл-источник ЭТОГО языка, когда он у каждого свой.
   *
   * У справочника грамматики папка в `source` называет место, а не файл:
   * корейский лежит в `grammar/grammarKo.ts`, русский — в `grammarRu.ts`.
   * Учителю нужен адрес, по которому правка действительно делается, поэтому
   * семья вправе уточнить его по языку.
   */
  sourceOf?: (lang: string) => string
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
      blocks: [
        ...(x.translation ? [{ kind: 'text', title: 'Перевод', text: x.translation } as const] : []),
        ...(x.glossary.length
          ? [{ kind: 'pairs', title: 'Словарь по клику', rows: x.glossary.map(g => ({ term: g.term, ru: g.ru })) } as const]
          : []),
        ...(x.questions.length
          ? [{
            kind: 'quiz', title: 'Вопросы к тексту',
            items: x.questions.map(q => ({ q: q.q, options: q.options, answer: q.correct, why: q.why })),
          } as const]
          : []),
      ],
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
    //
    // Поэтому же тут нет числа сцен у произведения: sceneCount считает их у
    // ЯЗЫКА, а поштучно они известны только внутри чанка. Ставить вместо этого
    // ноль хуже, чем не ставить ничего, — плитка врала бы «0 сцен».
    const { worksForLang, workLine, SHELVES } = await import('./scenes')
    const shelfTitle = (id: string) => SHELVES.find(sh => sh.id === id)?.title ?? id
    return worksForLang(lang).map(w => ({
      id: w.id,
      title: w.title,
      about: w.blurb,
      level: w.age,
      topic: shelfTitle(w.shelf),
      size: 0,
      meta: `${workLine(w)} · ${w.medium === 'book' ? 'книга' : w.medium === 'film' ? 'фильм' : 'сериал'}`,
    }))
  },
}

const feedFamily: MaterialFamily = {
  id: 'feed', mode: 'reading', label: 'Лента', source: 'src/data/feed/',
  hint: 'Новости и статьи из источников со свободной лицензией. Обновляется сборкой.',
  editable: false,
  async load(lang) {
    const [{ loadFeed }, { outletById }] = await Promise.all([import('./feed'), import('./feed/outlets')])
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
      blocks: [{ kind: 'pairs', title: 'Слова набора', rows: p.words.map(w => ({ term: w.term, ru: w.ru })) }],
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
      blocks: [{
        kind: 'pairs', title: 'Фразы темы',
        rows: x.phrases.map(p => ({ term: p.term, ru: p.ru, note: p.note })),
      }],
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
      body: n.why,
      blocks: [{ kind: 'pairs', title: 'Что путается', rows: n.words.map(w => ({ term: w.term, ru: w.ru })) }],
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
      blocks: [
        ...(x.credit ? [{ kind: 'text', title: 'Источник', text: x.credit } as const] : []),
        ...(x.translation ? [{ kind: 'text', title: 'Перевод', text: x.translation } as const] : []),
        ...(x.glossary.length
          ? [{ kind: 'pairs', title: 'Словарь', rows: x.glossary.map(g => ({ term: g.term, ru: g.ru })) } as const]
          : []),
        ...(x.questions.length
          ? [{
            kind: 'quiz', title: 'Вопросы к записи',
            items: x.questions.map(q => ({ q: q.q, options: q.options, answer: q.correct, why: q.why })),
          } as const]
          : []),
      ],
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
      blocks: [{
        kind: 'table', title: 'Восемь смыслов одной основы',
        head: ['Хвост', 'Смысл', 'Форма', 'Чтение', 'Перевод'],
        rows: KO_ENDINGS.map(e => {
          const f = v.forms[e.id]
          return [e.block, e.label, f?.form ?? '—', f?.reading ?? '—', f?.ru ?? '—']
        }),
      }],
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
      blocks: [{ kind: 'pairs', title: 'Что из него выводится', rows: r.words.map(w => ({ term: w.term, ru: w.ru })) }],
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
      blocks: [{
        kind: 'table', title: 'Ряд счёта',
        head: ['Форма', 'Чтение', 'Перевод', 'Замечание'],
        rows: s.rows.map(r => [r.form, r.reading, r.ru, r.note ?? '']),
      }],
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
      size: r.examples.length,
      meta: `${r.ko} · ${plural(r.examples.length, 'пример', 'примера', 'примеров')}`,
      body: r.why,
      blocks: [
        ...(r.trap ? [{ kind: 'text', title: 'Когда не работает', text: r.trap, tone: 'warn' } as const] : []),
        ...(r.examples.length
          ? [{
            kind: 'pairs', title: 'Примеры',
            rows: r.examples.map(e => ({ term: `${e.written} → [${e.spoken}]`, ru: e.ru, note: e.note })),
          } as const]
          : []),
      ],
    }))
  },
}

// ─── Грамматика ──────────────────────────────────────────────────────────────

const GRAMMAR_FILES: Record<string, string> = {
  ko: 'src/data/grammar/grammarKo.ts',
  ja: 'src/data/grammar/grammarJa.ts',
  en: 'src/data/grammar/grammarEn.ts',
  de: 'src/data/grammarDe.ts',
  ru: 'src/data/grammarRu.ts',
}

const grammarFamily: MaterialFamily = {
  id: 'grammar', mode: 'grammar', label: 'Формы', source: 'src/data/grammar/',
  sourceOf: lang => GRAMMAR_FILES[lang.split('-')[0].toLowerCase()] ?? 'src/data/grammar/',
  hint: 'Справочник форм: не курс, а место, куда приходят с вопросом «чем 은/는 отличается от 이/가».',
  editable: false,
  async load(lang) {
    const { loadGrammarRef } = await import('./grammar')
    const ref = await loadGrammarRef(lang)
    if (!ref) return []
    // Форма, названная по id, ничего не говорит: сравнение «отличается от
    // ko-eun-neun» читается как ошибка выгрузки. Поэтому соседа ищем в том же
    // справочнике и показываем его человеческим именем.
    const nameOf = (id: string) => {
      const other = ref.forms.find(x => x.id === id)
      return other ? `${other.form} — ${other.title}` : id
    }
    return ref.forms.map(f => ({
      id: f.id,
      title: `${f.form} — ${f.title}`,
      about: f.short,
      level: f.level,
      topic: f.chapter,
      size: f.examples.length,
      meta: `${plural(f.examples.length, 'пример', 'примера', 'примеров')} · ${plural(f.quiz.length, 'вопрос', 'вопроса', 'вопросов')}`,
      body: f.rule,
      blocks: [
        { kind: 'text', title: 'К чему клеится', text: f.attach },
        ...(f.table ? [{ kind: 'table', title: 'Формы', head: f.table.head, rows: f.table.rows } as const] : []),
        ...(f.examples.length
          ? [{
            kind: 'pairs', title: 'Примеры',
            rows: f.examples.map(e => ({ term: e.text, ru: e.ru, note: e.when })),
          } as const]
          : []),
        ...(f.pitfall ? [{ kind: 'text', title: 'Ловушка', text: f.pitfall, tone: 'warn' } as const] : []),
        ...(f.contrast?.length
          ? [{
            kind: 'text', title: 'Чем отличается от соседних',
            text: f.contrast.map(c => `${nameOf(c.with)}: ${c.note}`).join('\n\n'),
          } as const]
          : []),
        ...(f.quiz.length
          ? [{
            kind: 'quiz', title: 'Самопроверка',
            items: f.quiz.map(q => ({ q: q.q, options: q.options, answer: q.answer, why: q.why })),
          } as const]
          : []),
      ],
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
      blocks: c.cards.map(card => ({
        kind: 'text' as const,
        title: card.title,
        text: [
          card.text,
          ...(card.bullets ?? []).map(b => `• ${b}`),
          ...(card.keep ? [`Унести: ${card.keep}`] : []),
        ].join('\n'),
      })),
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
      size: b.parts.length,
      meta: `${b.kind} · ${b.free ? 'бесплатно' : 'платно'} · объясняет на ${b.explainedIn}`,
      body: b.about,
      blocks: [
        { kind: 'text', title: 'Когда за неё браться', text: b.when },
        ...(b.parts.length
          ? [{ kind: 'text', title: 'Что внутри', text: b.parts.map(x => `• ${x}`).join('\n') } as const]
          : []),
        ...(b.url
          ? [{ kind: 'text', title: 'Официальная страница', text: [b.url, b.urlNote].filter(Boolean).join('\n') } as const]
          : []),
      ],
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

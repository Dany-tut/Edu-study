// ── Уровни курса: свободная строка → фильтруемые корзины ─────────────────────
//
// `courses.level` — свободный текст, который учитель пишет руками: «ЕГЭ»,
// «A2 → B1 (Intermediário, CELPE-Bras)», «A1 → A2 (JLPT N5 → N4)». Фильтровать
// по такой строке точным совпадением бессмысленно — почти каждый курс даёт свой
// уникальный вариант, и в списке будет столько «уровней», сколько курсов.
//
// Поэтому строка разбирается на корзины:
//   • язык со своей шкалой (корейский, японский, китайский) → ступени этой
//     шкалы: TOPIK I/II, JLPT N5–N1, HSK 1–6. CEFR в такой строке — только
//     подсказка «примерно как A2», официальных уровней A1–C2 у этих языков нет,
//     и в фильтре они сбивают с толку. Поэтому если найдена родная шкала, CEFR
//     из корзин выбрасывается.
//   • остальные языковые курсы → все упомянутые ступени CEFR. Курс «A2 → B1»
//     попадает и в A2, и в B1: он проходит через оба, и искать его логично по
//     любому концу.
//   • экзаменационные → ЕГЭ / ОГЭ / AP / ВПР / Олимпиада по ключевому слову,
//     так что «Проба · ЕГЭ» и «Химия ЕГЭ» встают в одну корзину.
//   • всё остальное → сама строка как есть: лучше показать редкий вариант, чем
//     потерять курс из фильтра.
//
// Список уровней для дропдауна собирается из РЕАЛЬНЫХ курсов в текущей выборке
// (см. levelOptions), а не из статического справочника. Отсюда и требование
// «в физике нет уровней языковых курсов»: у физики просто нет курсов с CEFR,
// значит и ступеней A1–C2 в её списке не появится.

import { getSubject } from './subjects'

/** Ступени CEFR в порядке возрастания — они же порядок в дропдауне. */
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/**
 * Экзамены и форматы. Ищем по ключевому слову, а не по полному совпадению:
 * учителя пишут уровень как придётся («ЕГЭ 2027», «Проба · ЕГЭ»).
 */
const EXAMS: { key: string; re: RegExp }[] = [
  { key: 'ВПР', re: /впр/i },
  { key: 'ОГЭ', re: /огэ/i },
  { key: 'ЕГЭ', re: /егэ/i },
  { key: 'AP', re: /(^|[^a-z])ap([^a-z]|$)/i },
  { key: 'Олимпиада', re: /олимпиад/i },
]

/**
 * Собственные шкалы уровней языков, которые не пользуются CEFR. Порядок внутри
 * массива = порядок в дропдауне (от начального уровня к продвинутому), поэтому
 * TOPIK I идёт перед TOPIK II, а JLPT — от N5 к N1.
 *
 * TOPIK I ищем с оглядкой на «II»: без негативного просмотра вперёд строка
 * «TOPIK II» матчилась бы и на первый уровень тоже.
 */
const LANG_SCALES: { key: string; re: RegExp }[] = [
  { key: 'TOPIK I', re: /topik\s*i(?!i)/i },
  { key: 'TOPIK II', re: /topik\s*ii/i },
  ...['N5', 'N4', 'N3', 'N2', 'N1'].map(n => ({ key: `JLPT ${n}`, re: new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`, 'i') })),
  ...[1, 2, 3, 4, 5, 6].map(n => ({ key: `HSK ${n}`, re: new RegExp(`hsk\\s*${n}`, 'i') })),
]

/**
 * Порядок корзин в списке: CEFR → родные шкалы языков → экзамены → всё прочее.
 */
const ORDER = new Map<string, number>([
  ...CEFR.map((k, i) => [k, i] as [string, number]),
  ...LANG_SCALES.map((s, i) => [s.key, 50 + i] as [string, number]),
  ...EXAMS.map((e, i) => [e.key, 100 + i] as [string, number]),
])

/**
 * Корзины, в которые попадает курс с таким уровнем. Пустой массив — уровень не
 * заполнен: такой курс виден только без фильтра.
 */
export function levelBuckets(raw: string | undefined | null): string[] {
  const s = (raw ?? '').trim()
  if (!s) return []

  const out: string[] = []
  // Родная шкала языка старше CEFR: если курс объявлен как «A2 → B1 (TOPIK II,
  // 3급–4급)», в фильтре у корейского должен стоять TOPIK II, а не A2/B1.
  for (const sc of LANG_SCALES) if (sc.re.test(s)) out.push(sc.key)
  if (!out.length) {
    for (const step of CEFR) {
      // \b не годится: рядом со ступенью бывает «→» и скобки, но в кириллице
      // граница слова ведёт себя иначе, чем ожидаешь. Проверяем соседей явно.
      if (new RegExp(`(^|[^A-Za-z0-9])${step}([^A-Za-z0-9]|$)`, 'i').test(s)) out.push(step)
    }
  }
  for (const e of EXAMS) if (e.re.test(s)) out.push(e.key)

  return out.length ? out : [s]
}

/** Уровни в каноническом порядке: CEFR → экзамены → остальное по алфавиту. */
export function sortLevels(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const oa = ORDER.get(a) ?? 500
    const ob = ORDER.get(b) ?? 500
    return oa !== ob ? oa - ob : a.localeCompare(b, 'ru')
  })
}

/**
 * Список уровней для дропдауна — только те, что реально встречаются в
 * переданных курсах. Вызывать уже ПОСЛЕ фильтра по предмету, иначе список
 * перестанет подстраиваться под предмет.
 */
export function levelOptions(courses: { level: string }[]): string[] {
  const seen = new Set<string>()
  for (const c of courses) for (const b of levelBuckets(c.level)) seen.add(b)
  return sortLevels([...seen])
}

// ── Что предлагать в дропдауне «Уровень» ─────────────────────────────────────
// Фильтры собираются из реальных курсов (levelOptions), а вот при СОЗДАНИИ
// группы/карточки/курса выбирать ещё не из чего — там нужен справочник. Один
// общий список не годится: у корейского нет ЕГЭ, у химии нет A2. Поэтому набор
// зависит от предмета.

/** Школьный набор — предметы без языковой шкалы. */
const SCHOOL_LEVELS = ['ЕГЭ', 'ОГЭ', 'Олимпиада', 'Школа', 'Интенсив']

/**
 * Родная шкала языка (ключи совпадают с корзинами LANG_SCALES, иначе выбранный
 * уровень не совпал бы сам с собой в фильтре).
 */
const NATIVE_SCALE: Record<string, string[]> = {
  korean: ['TOPIK I', 'TOPIK II'],
  japanese: ['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'JLPT N1'],
  chinese: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'],
}

/** Профильные экзамены языка — сверх CEFR. */
const LANG_EXAMS: Record<string, string[]> = {
  english: ['ЕГЭ', 'ОГЭ', 'IELTS', 'TOEFL'],
  portuguese: ['CELPE-Bras'],
}

/**
 * Русский и литература помечены isLanguage (у них языковая палитра заданий), но
 * учатся по школьной программе: CEFR им не нужен, нужен ЕГЭ/ОГЭ.
 */
const SCHOOL_LANGUAGES = new Set(['russian', 'literature'])

/** Меряется ли предмет языковыми ступенями (CEFR и родная шкала), а не ЕГЭ/ОГЭ. */
export function usesLanguageLevels(subject: string | undefined | null): boolean {
  const def = getSubject(subject)
  return !!def?.isLanguage && !SCHOOL_LANGUAGES.has(def.id)
}

/**
 * Уровни для выбора при создании группы / карточки 1:1 / курса.
 * Неизвестный предмет (или пустой) → школьный набор, как было раньше.
 */
export function levelOptionsForSubject(subject: string | undefined | null): string[] {
  const def = getSubject(subject)
  if (!def || !usesLanguageLevels(subject)) return SCHOOL_LEVELS
  return [
    ...CEFR,
    ...(NATIVE_SCALE[def.id] ?? []),
    ...(LANG_EXAMS[def.id] ?? []),
    'Интенсив',
  ]
}

/** Подходит ли курс под выбранный уровень. Пустой фильтр пропускает всё. */
export function matchesLevel(course: { level: string }, level: string): boolean {
  if (!level) return true
  return levelBuckets(course.level).includes(level)
}

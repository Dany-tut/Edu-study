// ── Subject registry — the single source of truth for every subject ──────────
// Historically "subject" meant two different things: an English id
// ('biology' | 'chemistry') tied to the ЕГЭ task bank + curriculum, and a free
// Russian tag ('Химия', 'Биология', 'Физика' …) used on groups/courses. Both
// vocabularies now resolve through this one registry, so adding a subject is a
// data edit here — not a new hardcoded option list, palette switch, or icon map
// scattered across the codebase.
//
// Stage 1 (this file) covers the presentational + option layer: palette, icon,
// dropdown options, "does it have a task bank". The typed ЕГЭ curriculum
// (Subject union + Record maps in taskBankData.ts) is intentionally left as-is
// for now; it becomes data-driven in the taxonomy stage.

import type { SubjectPalette } from './theme'

export interface SubjectDef {
  /** English slug. Matches task_bank.subject / trainer ids for exam subjects. */
  id: string
  /** Russian display name. Matches the free-text groups.subject / courses.subject tag. */
  name: string
  /** Emoji shown across group/course pickers, cards and switchers. */
  icon: string
  /** True when the subject ships an ЕГЭ task bank + curriculum (biology, chemistry today). */
  hasBank: boolean
  /** True for language subjects — unlocks the language task-type palette (audio, word-bank, essay…). */
  isLanguage?: boolean
  /**
   * Язык РОДНОЙ, а не изучаемый: русский и литература.
   *
   * ЗАЧЕМ ОТДЕЛЬНЫЙ ФЛАГ, А НЕ ОТДЕЛЬНЫЙ ДВИЖОК. Вся языковая машина — карточки,
   * интервальные повторения, стопки, разбор слова по клику — построена на паре
   * «слово чужого языка → русский перевод». У родного языка перевода нет, и
   * карточка «слово → перевод» на русском вырождается в бессмыслицу («досада —
   * досада»). Но сама механика (колода, свайп, SRS, стопки, запись голоса)
   * подходит идеально, и вторая её копия разъехалась бы с первой на первой же
   * правке.
   *
   * Поэтому движок один, а поля читаются иначе: `ru` — не перевод, а ТОЛКОВАНИЕ
   * своими словами, `reading` — ударение и произношение (звони́т), `alt` —
   * синонимы слова, по которым засчитывается ответ. Флаг переключает подписи и
   * проверку ответа (lib/answerMatch.ts), а не набор экранов.
   */
  native?: boolean
  /**
   * BCP-47 изучаемого языка. Нужен там, где предмет надо сопоставить с
   * контентом на этом языке: библиотека текстов, синтез речи, словари.
   * У неязыковых предметов не заполняется.
   */
  langCode?: string
  /**
   * Лестница званий по уровням (индекс = уровень−1, дальше держится последнее).
   * Пусто — берётся нейтральная DEFAULT_RANKS: химические «Атомы · Молекулы ·
   * Реакции» ученику корейского не говорят ни о чём.
   */
  ranks?: string[]
  light: SubjectPalette
  dark: SubjectPalette
}

/** Звания, когда у предмета нет своих (или предмет вообще неизвестен). */
export const DEFAULT_RANKS = ['Старт', 'Новичок', 'Ученик', 'Практик', 'Знаток', 'Эксперт', 'Мастер']

// Языкам лестница общая: путь от букв к свободной речи одинаков и для
// корейского, и для португальского.
const LANG_RANKS = ['Старт', 'Алфавит', 'Слова', 'Фразы', 'Диалоги', 'Свободная речь', 'Мастер']

// Родному языку та же лестница не годится: «Алфавит» и «Свободная речь» у
// человека, который говорит по-русски с рождения, уже пройдены при рождении.
// Русский растёт не вширь, а вглубь: разговор → точность → стиль → публично.
const NATIVE_RANKS = ['Старт', 'Разговор', 'Точность', 'Стиль', 'Публично', 'Мастерская', 'Мастер']

// ── Palette helpers ──────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function clamp255(n: number): number { return Math.max(0, Math.min(255, Math.round(n))) }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => clamp255(v).toString(16).padStart(2, '0')).join('')
}

/** Затемнить цвет на долю k (0…1) — умножением каналов, оттенок сохраняется. */
function darken(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - k), g * (1 - k), b * (1 - k))
}

/** Относительная яркость по WCAG — по ней считается контраст с белым текстом. */
function relLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Заливка сплошной кнопки из акцента предмета — для белого текста.
 *
 * Акцент предмета сам по себе под заливку не годится: он подобран как цвет
 * ТЕКСТА и в тёмной теме светлый (#F0805E у английского, #B3A6F7 у химии),
 * белые буквы на нём тонут. Поэтому цвет затемняется ровно до тех пор, пока
 * контраст с белым не дотянет до 4.5:1, и уходит в градиент — по устройству
 * тот же `--grad-purple`, только в цвете предмета.
 */
export function subjectFill(accent: string): string {
  // 4.5:1 против белого ⇔ яркость ≤ 0.183. Шаг мелкий нарочно: крупный
  // проскакивает порог и гасит цвет сильнее, чем нужно (коралл уходит в бурый).
  let base = accent
  for (let i = 0; i < 16 && relLuminance(base) > 0.183; i++) base = darken(base, 0.06)
  return `linear-gradient(135deg, ${base}, ${darken(base, 0.22)})`
}

/** Build a light+dark palette pair for a tag subject from its accent + AA text color. */
function palettePair(accent: string, accentDark: string, text: string, textDark: string): { light: SubjectPalette; dark: SubjectPalette } {
  return {
    light: { text, soft: hexToRgba(accent, 0.14), accent, onAccent: '#FFFFFF', ring: hexToRgba(accent, 0.16) },
    dark: { text: textDark, soft: hexToRgba(accentDark, 0.2), accent: accentDark, onAccent: '#FFFFFF', ring: hexToRgba(accentDark, 0.25) },
  }
}

// Biology & Chemistry keep their exact existing hex (moved verbatim from theme.ts)
// so the two live subjects render pixel-identical — this is a non-breaking change.
const BIOLOGY_LIGHT: SubjectPalette = { text: '#0E8F5F', soft: '#DFF7EC', accent: '#1DB97D', onAccent: '#FFFFFF', ring: 'rgba(29,185,125,0.16)' }
const BIOLOGY_DARK: SubjectPalette = { text: '#4ECFA0', soft: '#0D2B1E', accent: '#2ABD8A', onAccent: '#FFFFFF', ring: 'rgba(42,189,138,0.25)' }
const CHEMISTRY_LIGHT: SubjectPalette = { text: '#3D33A0', soft: '#E7E4FB', accent: '#6354CF', onAccent: '#FFFFFF', ring: 'rgba(99,84,207,0.16)' }
const CHEMISTRY_DARK: SubjectPalette = { text: '#C08AFF', soft: '#201336', accent: '#9B6FE8', onAccent: '#FFFFFF', ring: 'rgba(155,111,232,0.25)' }

// ── The registry ─────────────────────────────────────────────────────────────
// Order here is the order used in dropdowns/option lists.
export const SUBJECTS: SubjectDef[] = [
  { id: 'chemistry', name: 'Химия', icon: '🧪', hasBank: true, ranks: ['Старт', 'Атомы', 'Молекулы', 'Реакции', 'Растворы', 'Эксперт', 'Мастер'], light: CHEMISTRY_LIGHT, dark: CHEMISTRY_DARK },
  { id: 'biology', name: 'Биология', icon: '🧬', hasBank: true, ranks: ['Старт', 'Клетка', 'Ткани', 'Организм', 'Экосистема', 'Эксперт', 'Мастер'], light: BIOLOGY_LIGHT, dark: BIOLOGY_DARK },
  { id: 'physics', name: 'Физика', icon: '⚡', hasBank: false, ranks: ['Старт', 'Механика', 'Энергия', 'Поля', 'Кванты', 'Эксперт', 'Мастер'], ...palettePair('#0E9B9B', '#37C2C2', '#0B7A7A', '#5FD6D6') },
  { id: 'math', name: 'Математика', icon: '📐', hasBank: false, ranks: ['Старт', 'Числа', 'Уравнения', 'Функции', 'Пределы', 'Эксперт', 'Мастер'], ...palettePair('#2B7FFF', '#5C9CFF', '#1E5FD6', '#8FBCFF') },
  { id: 'russian', name: 'Русский', icon: '📝', hasBank: false, isLanguage: true, native: true, langCode: 'ru', ranks: NATIVE_RANKS, ...palettePair('#E0567F', '#EC7EA0', '#B23A60', '#F0A0BB') },
  { id: 'literature', name: 'Литература', icon: '📖', hasBank: false, isLanguage: true, native: true, langCode: 'ru', ranks: ['Старт', 'Строки', 'Сюжеты', 'Образы', 'Эпохи', 'Эксперт', 'Мастер'], ...palettePair('#A25AD4', '#BE86E6', '#7E3DAE', '#CFA3EE') },
  { id: 'history', name: 'История', icon: '🏛️', hasBank: false, ranks: ['Старт', 'Даты', 'Эпохи', 'Реформы', 'Хроника', 'Эксперт', 'Мастер'], ...palettePair('#C08A3E', '#D6A860', '#93661F', '#E0BE86') },
  { id: 'english', name: 'Английский', icon: '🇬🇧', hasBank: false, isLanguage: true, langCode: 'en', ranks: LANG_RANKS, ...palettePair('#E4572E', '#F0805E', '#B23E1C', '#F5A186') },
  { id: 'korean', name: 'Корейский', icon: '🇰🇷', hasBank: false, isLanguage: true, langCode: 'ko', ranks: LANG_RANKS, ...palettePair('#3F51B5', '#7A88DC', '#2F3C8C', '#A3ADEA') },
  { id: 'japanese', name: 'Японский', icon: '🇯🇵', hasBank: false, isLanguage: true, langCode: 'ja', ranks: LANG_RANKS, ...palettePair('#B3122B', '#DE5468', '#8C0E21', '#EF8C9A') },
  { id: 'portuguese', name: 'Португальский', icon: '🇧🇷', hasBank: false, isLanguage: true, langCode: 'pt-BR', ranks: LANG_RANKS, ...palettePair('#2E8B37', '#5CB565', '#1F6B27', '#8FD196') },
  { id: 'german', name: 'Немецкий', icon: '🇩🇪', hasBank: false, isLanguage: true, langCode: 'de', ranks: LANG_RANKS, ...palettePair('#3E6B92', '#6E9BC4', '#2C5273', '#9CBEDC') },
]

// Lookup by either the English id or the Russian name, case-insensitive.
const BY_KEY = new Map<string, SubjectDef>()
for (const s of SUBJECTS) {
  BY_KEY.set(s.id.toLowerCase(), s)
  BY_KEY.set(s.name.toLowerCase(), s)
}

/** Resolve a subject by its id or Russian name. Returns undefined if unknown. */
export function getSubject(idOrName: string | undefined | null): SubjectDef | undefined {
  if (!idOrName) return undefined
  return BY_KEY.get(String(idOrName).trim().toLowerCase())
}

/** Palette for a subject (light/dark). Unknown subjects fall back to chemistry, as before. */
export function resolveSubjectPalette(idOrName: string | undefined, dark = false): SubjectPalette {
  const s = getSubject(idOrName) ?? SUBJECTS[0] // SUBJECTS[0] === chemistry
  return dark ? s.dark : s.light
}

/** Родной язык (русский, литература): карточка несёт толкование, а не перевод. */
export function isNativeSubject(idOrName: string | undefined): boolean {
  return !!getSubject(idOrName)?.native
}

/** Emoji for a subject, '📚' if unknown. */
export function subjectIcon(idOrName: string | undefined): string {
  return getSubject(idOrName)?.icon ?? '📚'
}

/**
 * Звание ученика на уровне `level` (1-based) по его предмету. Выше последней
 * ступени звание не растёт — уровни бесконечные, лестница нет.
 */
export function subjectRank(idOrName: string | undefined, level: number): string {
  const ranks = getSubject(idOrName)?.ranks ?? DEFAULT_RANKS
  return ranks[Math.min(Math.max(level, 1) - 1, ranks.length - 1)]
}

/** name → icon map — drop-in for the old inline SUBJECT_ICONS Records. */
export const SUBJECT_ICON_MAP: Record<string, string> = Object.fromEntries(SUBJECTS.map(s => [s.name, s.icon]))

/** Options for a course/group subject <select>: value = Russian name, icon-prefixed label. */
export function courseSubjectOptions(): { value: string; label: string }[] {
  return SUBJECTS.map(s => ({ value: s.name, label: `${s.icon} ${s.name}` }))
}

/**
 * Options for a trainer / task-bank subject filter (only subjects that have a bank).
 * `withAll` prepends an "Все" (all) option with an empty value.
 * Values are English ids to match task_bank.subject.
 */
export function bankSubjectOptions(withAll = true): { value: string; label: string }[] {
  const opts = SUBJECTS.filter(s => s.hasBank).map(s => ({ value: s.id, label: s.name }))
  return withAll ? [{ value: '', label: 'Все' }, ...opts] : opts
}

/** English ids of every subject that has a task bank — replaces hardcoded ['biology','chemistry']. */
export const BANK_SUBJECT_IDS: string[] = SUBJECTS.filter(s => s.hasBank).map(s => s.id)

// ── Per-teacher scope helpers ────────────────────────────────────────────────
// A teacher's allowed set (profiles.subjects) uses "empty = ALL subjects"
// semantics — matching the hidden_tabs convention. These helpers collapse that
// rule so call sites never special-case the empty array.

/** Subject defs a teacher may use. Empty/undefined allow-list = every subject. */
export function allowedSubjectDefs(allowed: string[] | null | undefined): SubjectDef[] {
  if (!allowed || allowed.length === 0) return SUBJECTS
  const ids = new Set(allowed.map(a => getSubject(a)?.id).filter(Boolean) as string[])
  return SUBJECTS.filter(s => ids.has(s.id))
}

/** True if the subject is within the teacher's allowed set (empty set = all). */
export function isSubjectAllowed(idOrName: string | undefined, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  const id = getSubject(idOrName)?.id
  return !!id && allowedSubjectDefs(allowed).some(s => s.id === id)
}

/** Bank-subject filter options scoped to a teacher's allowed set. */
export function bankSubjectOptionsFor(allowed: string[] | null | undefined, withAll = true): { value: string; label: string }[] {
  const opts = allowedSubjectDefs(allowed).filter(s => s.hasBank).map(s => ({ value: s.id, label: s.name }))
  return withAll ? [{ value: '', label: 'Все' }, ...opts] : opts
}

/** Bank-subject ids scoped to a teacher's allowed set — replaces default ['biology','chemistry']. */
export function bankSubjectIdsFor(allowed: string[] | null | undefined): string[] {
  return allowedSubjectDefs(allowed).filter(s => s.hasBank).map(s => s.id)
}

/** True if the subject (by id or Russian name) is a language subject — gates the language task palette. */
export function isLanguageSubject(idOrName: string | undefined): boolean {
  return !!getSubject(idOrName)?.isLanguage
}

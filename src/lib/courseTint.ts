// ─────────────────────────────────────────────────────────────────────────────
// Оттенок курса — перекраска интерфейса под предмет открытого курса.
//
// ЗАЧЕМ. Кабинет держит несколько курсов сразу, и переключение между ними было
// видно ровно в одном пикселе — чипсе в доке. Экран при этом оставался
// брендово-фиолетовым, и «я сейчас в английском» приходилось помнить, а не
// видеть. Здесь цвет предмета становится акцентом всего экрана.
//
// КАК. Весь фиолетовый в проекте — переменные (--color-accent, --grad-purple,
// --color-purple-soft, --color-purple-text: ~660 мест). Поэтому перекраска —
// это не обход компонентов, а запись нескольких свойств в style корневого
// элемента; снятие — их удаление. Ни один компонент про оттенок не знает.
//
// ЧЕГО ЗДЕСЬ НАМЕРЕННО НЕТ. Семафор — зелёный «сдано», жёлтый «возврат»,
// красный «просрочка» — не трогается никогда, иначе на португальском курсе
// (акцент #2E8B37) кнопка действия станет цветом верного ответа. По той же
// причине статус «сейчас» на трассе курса переведён на отдельные фиксированные
// переменные (--status-now-*, index.css): при коралловом английском он
// сливался бы с «просрочкой».
// ─────────────────────────────────────────────────────────────────────────────

import { getSubject, registrySubjectPalette, darken, lighten, mixHex, hexToRgba } from './subjects'

/** Глубина перекраски. Порядок — от слабой к сильной, каждая включает предыдущую. */
export type TintLevel = 'off' | 'accent' | 'soft' | 'ambient'

export const TINT_LEVELS: { id: TintLevel; label: string; hint: string }[] = [
  { id: 'off',     label: 'Выключено', hint: 'Один фиолетовый на все курсы' },
  { id: 'accent',  label: 'Акцент',    hint: 'Кнопки, прогресс, активная иконка' },
  { id: 'soft',    label: 'Подложки',  hint: 'Плюс плитки, бейджи, статистика' },
  { id: 'ambient', label: 'Среда',     hint: 'Плюс фон и стекло — весь экран в тоне' },
]

export const DEFAULT_TINT_LEVEL: TintLevel = 'soft'

export function isTintLevel(v: unknown): v is TintLevel {
  return v === 'off' || v === 'accent' || v === 'soft' || v === 'ambient'
}

/**
 * Ключ карты цветов. Предмет по коду ходит в двух видах — русским именем с
 * группы/курса («Английский») и английским id реестра («english»); ключ всегда
 * второй, иначе один и тот же предмет получит две записи в настройках.
 */
export function subjectKey(subject: string | undefined | null): string | null {
  return getSubject(subject ?? undefined)?.id ?? null
}

/**
 * Цвет предмета с учётом слоёв: правка ученика → база учителя → реестр.
 *
 * Порядок именно такой по требованию: ученик, которому цвет учителя не подошёл
 * (в том числе по зрению), перебивает его у себя, а учитель продолжает видеть
 * свой — карты хранятся отдельно и никогда не пишутся друг в друга.
 */
export function resolveAccent(
  subject: string | undefined | null,
  overrides: { student?: Record<string, string>; teacher?: Record<string, string> },
  dark = false,
): string {
  const key = subjectKey(subject)
  if (key) {
    const own = overrides.student?.[key]
    if (own) return dark ? toDarkAccent(own) : own
    const base = overrides.teacher?.[key]
    if (base) return dark ? toDarkAccent(base) : base
  }
  // Дно — реестр, а не resolveSubjectPalette: тот уже смотрит в объединённую
  // карту переопределений, и «цвет нижнего слоя» вернул бы сам себя.
  return registrySubjectPalette(subject ?? undefined, dark).accent
}

/** Светлый вариант акцента для тёмной темы — пипетка в настройках всего одна. */
export function toDarkAccent(hex: string): string {
  let a = hex
  for (let i = 0; i < 20 && luminance(a) < 0.30; i++) a = lighten(a, 0.08)
  return a
}

/** «r, g, b» для rgba(var(--accent-rgb), α) — теней и каёмок в цвете курса. */
function rgbTriple(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Цвет под белым текстом: тот же порог 4.5:1, что и в subjectFill. */
function onWhiteText(hex: string): string {
  let c = hex
  for (let i = 0; i < 20 && luminance(c) > 0.183; i++) c = darken(c, 0.06)
  return c
}

// Нейтрали светлой и тёмной темы — из index.css. Держим копию здесь, потому что
// уровень «среда» уводит их в оттенок курса и должен знать, от чего считать.
const NEUTRAL = {
  light: { bg: '#F5F5F6', bg2: '#F9F9FB', bg3: '#F0F0F2', bg4: '#FAFAFA', bg5: '#EBEBEF', input: '#ECEDF1', glass: '#FFFFFF' },
  dark:  { bg: '#111113', bg2: '#1A1A1C', bg3: '#222224', bg4: '#1E1E20', bg5: '#2A2A2C', input: '#202022', glass: '#161618' },
}

// Доля акцента в нейтралях на уровне «среда». В тёмной теме больше: тот же
// процент на почти чёрном фоне не читается вовсе.
const AMBIENT_MIX = { light: 0.045, dark: 0.085 }

/**
 * Набор переменных для одного акцента. Возвращает плоскую карту «свойство →
 * значение»; какие из них применить, решает уровень.
 */
export function tintVars(hex: string, level: TintLevel, dark: boolean): Record<string, string> {
  if (level === 'off') return {}
  const accent = dark ? toDarkAccent(hex) : hex
  const fillBase = onWhiteText(hex)
  const vars: Record<string, string> = {
    '--color-accent': accent,
    '--color-purple': accent,
    // Заливка чекбокса/радио — под белой галочкой, поэтому от затемнённого.
    '--color-control-accent': fillBase,
    // Градиент строим сами, а не берём subjectFill: тот затемняет ОБА конца до
    // 4.5:1 с белым, и выбранный цвет в заливке уже не узнать — коралл уходил
    // в бурый. Здесь светлый конец — ровно тот цвет, что выбрали, тёмный —
    // затемнённый до порога; белый текст ложится на тот же перепад, что и в
    // брендовом --grad-purple (светлый верх → тёмный низ).
    '--grad-purple': `linear-gradient(135deg, ${luminance(hex) > luminance(fillBase) ? hex : lighten(fillBase, 0.18)}, ${fillBase})`,
    '--grad-purple-bar': `linear-gradient(90deg, ${fillBase}, ${lighten(fillBase, 0.22)})`,
    '--glow-accent': dark ? '0 12px 28px rgba(0,0,0,0.45)' : `0 12px 28px ${hexToRgba(fillBase, 0.35)}`,
    // Тени и каёмки, что живут не переменной, а собственной прозрачностью.
    // В тёмной теме от осветлённого акцента: затемнённый fillBase на почти
    // чёрном фоне не виден вовсе.
    '--accent-rgb': rgbTriple(dark ? accent : fillBase),
    // Подложка активной таблетки переключателей — курса, модулей, разделов
    // тренажёра. Без неё переключатель курса оставался единственным фиолетовым
    // пятном посреди кораллового английского: экран уже перекрашен, а кнопка,
    // которой этот курс и выбирают, — ещё нет.
    '--tab-pill-active': dark ? hexToRgba(accent, 0.30) : hexToRgba(hex, 0.12),
  }
  if (level === 'accent') return vars

  vars['--color-purple-soft'] = dark ? hexToRgba(accent, 0.22) : hexToRgba(hex, 0.13)
  vars['--color-purple-text'] = dark ? lighten(accent, 0.45) : onWhiteText(hex)
  if (level === 'soft') return vars

  const n = dark ? NEUTRAL.dark : NEUTRAL.light
  const t = dark ? AMBIENT_MIX.dark : AMBIENT_MIX.light
  vars['--color-bg'] = mixHex(n.bg, hex, t)
  vars['--color-bg-2'] = mixHex(n.bg2, hex, t)
  vars['--color-bg-3'] = mixHex(n.bg3, hex, t)
  vars['--color-bg-4'] = mixHex(n.bg4, hex, t)
  vars['--color-bg-5'] = mixHex(n.bg5, hex, t)
  vars['--color-bg-input'] = mixHex(n.input, hex, t)
  const glass = mixHex(n.glass, hex, t)
  vars['--glass-rgb'] = `${parseInt(glass.slice(1, 3), 16)}, ${parseInt(glass.slice(3, 5), 16)}, ${parseInt(glass.slice(5, 7), 16)}`
  return vars
}

// Брендовые значения тех же переменных — то, что стоит в index.css, когда
// оттенка нет. Нужны превью: оно показывает уровень, ОТЛИЧНЫЙ от применённого
// сейчас, и переменные, которые на этом уровне не красятся, обязано вернуть к
// брендовым, а не унаследовать текущие от документа.
const BASE: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--color-accent': '#7E6EE6',
    '--color-purple': '#9C8CF0',
    '--color-control-accent': '#6353C4',
    '--grad-purple': 'linear-gradient(135deg, #9D8BFF, #6A5AE6)',
    '--grad-purple-bar': 'linear-gradient(90deg, #6A5AE6, #A697FF)',
    '--glow-accent': '0 12px 28px rgba(106,90,230,0.35)',
    '--accent-rgb': '99, 84, 207',
    '--tab-pill-active': 'rgba(120,106,215,0.12)',
    '--color-purple-soft': '#E7E4FB',
    '--color-purple-text': '#3D33A0',
    '--color-bg': NEUTRAL.light.bg,
    '--color-bg-2': NEUTRAL.light.bg2,
    '--color-bg-3': NEUTRAL.light.bg3,
    '--color-bg-4': NEUTRAL.light.bg4,
    '--color-bg-5': NEUTRAL.light.bg5,
    '--color-bg-input': NEUTRAL.light.input,
    '--glass-rgb': '255, 255, 255',
  },
  dark: {
    '--color-accent': '#B3A6F7',
    '--color-purple': '#B3A6F7',
    '--color-control-accent': '#6B5FC0',
    '--grad-purple': 'linear-gradient(135deg, #9D8BFF, #6A5AE6)',
    '--grad-purple-bar': 'linear-gradient(90deg, #6A5AE6, #A697FF)',
    '--glow-accent': '0 12px 28px rgba(0,0,0,0.45)',
    '--accent-rgb': '124, 108, 224',
    '--tab-pill-active': 'rgba(140,128,235,0.30)',
    '--color-purple-soft': 'rgba(124,108,224,0.22)',
    '--color-purple-text': '#DAD3FB',
    '--color-bg': NEUTRAL.dark.bg,
    '--color-bg-2': NEUTRAL.dark.bg2,
    '--color-bg-3': NEUTRAL.dark.bg3,
    '--color-bg-4': NEUTRAL.dark.bg4,
    '--color-bg-5': NEUTRAL.dark.bg5,
    '--color-bg-input': NEUTRAL.dark.input,
    '--glass-rgb': '22, 22, 24',
  },
}

/**
 * Полный набор переменных для превью в настройках: то, что даёт уровень, плюс
 * брендовые значения на всё остальное. Вешается на обёртку макета — внутри неё
 * экран живёт по своим цветам, независимо от того, как покрашено приложение.
 */
export function previewVars(hex: string, level: TintLevel, dark: boolean): Record<string, string> {
  return { ...BASE[dark ? 'dark' : 'light'], ...tintVars(hex, level, dark) }
}

// Все переменные, которые уровень может занять. Снятие идёт по этому списку, а
// не по последней применённой карте: иначе понижение уровня «среда» → «акцент»
// оставляло бы подкрашенный фон навсегда.
const OWNED = [
  '--color-accent', '--color-purple', '--color-control-accent', '--grad-purple', '--grad-purple-bar', '--glow-accent', '--accent-rgb', '--tab-pill-active',
  '--color-purple-soft', '--color-purple-text',
  '--color-bg', '--color-bg-2', '--color-bg-3', '--color-bg-4', '--color-bg-5', '--color-bg-input', '--glass-rgb',
]

/**
 * Применить оттенок к документу. `hex = null` или `level = 'off'` — снять всё и
 * вернуться к брендовому фиолетовому.
 */
export function applyCourseTint(hex: string | null, level: TintLevel, dark: boolean) {
  const root = document.documentElement
  const vars = hex ? tintVars(hex, level, dark) : {}
  OWNED.forEach(name => {
    const v = vars[name]
    if (v) root.style.setProperty(name, v)
    else root.style.removeProperty(name)
  })
  // Полоса статуса в Safari красится в тот же фон, что и страница, иначе на
  // уровне «среда» сверху остаётся серый кант чужого оттенка.
  const bg = vars['--color-bg'] ?? (dark ? NEUTRAL.dark.bg : NEUTRAL.light.bg)
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) meta.setAttribute('content', bg)
}

/**
 * Палитра выбора в настройках. Не произвольная пипетка нарочно: каждый цвет
 * здесь — акцент из реестра предметов, то есть уже проверен и как текст на
 * белом, и как заливка под белыми буквами в обеих темах. Свободный выбор дал бы
 * жёлтый #FFE14D, на котором пропадает и текст, и кнопка.
 */
export const TINT_SWATCHES: string[] = [
  '#E4572E', '#E0567F', '#B3122B', '#C08A3E',
  '#2E8B37', '#1DB97D', '#0E9B9B', '#2B7FFF',
  '#3F51B5', '#3E6B92', '#6354CF', '#A25AD4',
]

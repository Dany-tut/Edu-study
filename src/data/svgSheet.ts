// ─────────────────────────────────────────────────────────────────────────────
// Примитивы векторных картинок курса
//
// Общая основа для двух наборов изображений: seedImages.ts (картинки внутри
// заданий — «опишите картинку», «сравните») и lessonFigures.ts (иллюстрации
// конспекта — таблицы письма, схемы форм, шкалы). Раньше эти функции лежали
// приватно в seedImages.ts; второй набор картинок означал бы вторую копию
// обёртки и второй набор цветов, который начнёт расходиться с первым.
//
// ПОЧЕМУ SVG В data-URI, А НЕ ФАЙЛ В STORAGE
// Сид не должен тащить за собой медиа: он открывается в редакторе как черновик,
// и до «Сохранить» в БД ничего нет. Схема весит 1–3 КБ текстом — это дешевле
// любого PNG и переживает копирование курса вместе с JSONB. Ученику приходит
// обычная строка, которую <img> рисует как есть.
//
// ЧИТАЕМОСТЬ В ТЁМНОЙ ТЕМЕ
// Картинка — это «лист бумаги»: у каждой явный светлый фон и тёмные линии.
// Подстраиваться под тему нельзя (это статичный src внутри <img>), а тёмное по
// тёмному было бы невидимым. Светлый лист на тёмном фоне выглядит нормально.
// ─────────────────────────────────────────────────────────────────────────────

/** SVG-разметка → data-URI для <img src>. */
export function toDataUri(svg: string): string {
  // Схлопываем переносы и лишние пробелы: в data-URI они кодируются посимвольно
  // и раздувают строку впустую.
  const compact = svg.replace(/\s*\n\s*/g, ' ').trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(compact)}`
}

/** Экранирование текста внутри SVG. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const PAPER = '#FFFFFF'
export const INK = '#1F2430'
export const MUTED = '#6B7280'
export const GRID = '#D7DBE3'
/** Заливка «карточки» внутри листа — блока, ячейки таблицы, шага схемы. */
export const TILE = '#F2F4F9'
/** Акцент — им подсвечивается то, ради чего картинка нарисована. */
export const ACCENT = '#5B4FC7'
export const ACCENT_SOFT = '#ECEAFB'

/**
 * Шрифт листа. Хангыль, кана и иероглифы не входят в Helvetica: без явного
 * запасного семейства часть символов на iOS и в Windows съезжает по базовой
 * линии или рисуется совсем другим кеглем, и таблица письма разъезжается.
 */
export const FONT = "Helvetica, Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK KR', 'Noto Sans CJK JP', sans-serif"

const WIDE_CHAR = /[\u1100-\u11FF\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7FF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60]/

/**
 * Ширина строки в пикселях.
 *
 * Считать длину в символах нельзя: иероглиф и хангыль рисуются почти
 * квадратными (ширина ≈ кегль), латиница с кириллицей — вдвое уже. Колонка,
 * посчитанная «по числу знаков», в корейской таблице переполнялась, а в
 * русской пустовала.
 */
export function textW(text: string, fs: number): number {
  let w = 0
  for (const ch of text) w += WIDE_CHAR.test(ch) ? fs : fs * 0.55
  return w
}

/**
 * Кегль, при котором строка помещается в отведённую ширину.
 *
 * Ужать текст лучше, чем выпустить его за рамку: в одной колонке стоят и
 * короткая формула, и длинное название фермента.
 */
export function fitFs(text: string, maxW: number, base: number, min = 9): number {
  const need = textW(text, base)
  if (need <= maxW || !text) return base
  return Math.max(min, Math.round((base * maxW / need) * 10) / 10)
}

/** Кегль и межстрочный сноски под схемой. */
export const NOTE_FS = 11.5
export const NOTE_LH = 16

/**
 * Разбивка строки по ширине листа.
 *
 * Кегль передаётся снаружи: тем же переносом живут и сноска (11.5), и строка
 * примера под схемой (13.5). Одной строкой без переноса длинный текст просто
 * уезжал за край листа и обрезался — причём обрезается там как раз оговорка,
 * ради которой сноска и написана.
 */
export function wrapLines(text: string, w: number, fs = NOTE_FS): string[] {
  const max = w - 36
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && textW(next, fs) > max) { lines.push(line); line = word }
    else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Высота, которую займёт сноска под схемой (0 — сноски нет). */
export function noteH(note: string | undefined, w: number): number {
  return note ? 10 + wrapLines(note, w).length * NOTE_LH : 8
}

/**
 * Сноска, прижатая к нижнему краю листа.
 *
 * Позицию считаем от высоты листа, а не от конца содержимого: сноска в две
 * строки, поставленная по фиксированному отступу, вылезала за нижний край и
 * обрезалась вместе со второй строкой.
 */
export function noteAt(w: number, h: number, note?: string): string {
  if (!note) return ''
  const first = h - noteH(note, w) + 18
  return wrapLines(note, w)
    .map((line, i) => `<text x="${w / 2}" y="${first + i * NOTE_LH}" text-anchor="middle" font-size="${NOTE_FS}" fill="${MUTED}">${esc(line)}</text>`)
    .join('')
}

/** Общая обёртка: белый лист, заголовок сверху по центру. */
export function sheet(w: number, h: number, title: string, body: string): string {
  // Заголовок ужимаем под ширину листа.
  //
  // ЗАЧЕМ. Ширину холста генераторы считают по СОДЕРЖИМОМУ — по блокам схемы
  // или колонкам таблицы. Заголовок в этот расчёт не входит, и длинное название
  // темы («Живая реакция: да ладно, серьёзно, вот это да») на узком листе
  // уезжало за оба края. Ужать заголовок дешевле, чем растягивать лист под него:
  // от ширины листа зависит вся вёрстка внутри.
  const fs = Math.max(10, Math.min(15, (w - 24) / textW(title, 1)))
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
    <rect width="${w}" height="${h}" fill="${PAPER}"/>
    <text x="${w / 2}" y="28" text-anchor="middle" font-size="${Math.round(fs * 10) / 10}" font-weight="700" fill="${INK}">${esc(title)}</text>
    ${body}
  </svg>`
}

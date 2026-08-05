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

/** Общая обёртка: белый лист, заголовок сверху по центру. */
export function sheet(w: number, h: number, title: string, body: string): string {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
    <rect width="${w}" height="${h}" fill="${PAPER}"/>
    <text x="${w / 2}" y="28" text-anchor="middle" font-size="15" font-weight="700" fill="${INK}">${esc(title)}</text>
    ${body}
  </svg>`
}

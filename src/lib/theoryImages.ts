// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспекта: текст ↔ абзацы
//
// Конспект урока в редакторе — одна строка (поле «Конспект»), а у ученика —
// массив абзацев в lessons.content. Картинка живёт в этом же потоке: абзац,
// у которого задан `image`, рисуется как иллюстрация с подписью, и порядок
// «текст — картинка — текст» задаётся тем, где стоит абзац.
//
// ПОЧЕМУ МАРКЕР, А НЕ ОТДЕЛЬНЫЙ СПИСОК КАРТИНОК
// Картинке нужно место в тексте: схема падежей после правила и схема падежей в
// конце урока — разные вещи. Список «картинки урока» этого места не задаёт, а
// поле ввода у нас textarea. Поэтому в тексте стоит строка-маркер
// `![подпись](img:2)` — её видно, её можно двигать и удалять как абзац.
//
// ПОЧЕМУ ССЫЛКА `img:N`, А НЕ САМ data-URI
// Векторная схема весит 1–3 КБ текстом. Вставленная в поле «Конспект» целиком,
// она делает конспект нередактируемым: учитель видит километр base64 вместо
// своего текста. Поэтому сами картинки лежат рядом (CELesson.theoryImages), а
// в тексте стоит короткая ссылка. Прямой URL в маркере тоже работает — им
// пользуются вставки «картинка из интернета».
// ─────────────────────────────────────────────────────────────────────────────

import type { LessonParagraph } from '../data/lessonContent'

/** Картинка конспекта, на которую из текста ссылается маркер `img:<key>`. */
export interface TheoryImage {
  /** Короткий ключ в пределах урока — «1», «2», …; попадает в маркер. */
  key: string
  /** data-URI или обычная ссылка. */
  src: string
}

/** Строка-абзац целиком является маркером картинки: `![подпись](ссылка)`. */
const FIGURE_LINE = /^!\[([^\]]*)\]\(\s*(\S+)\s*\)$/

/** Маркер для строки конспекта. Подпись может быть пустой. */
export function figureMarker(caption: string, ref: string): string {
  return `![${caption}](${ref})`
}

/** Разбор одной строки конспекта: маркер картинки или обычный текст. */
function parseFigureLine(text: string): { caption: string; ref: string } | null {
  const m = text.trim().match(FIGURE_LINE)
  return m ? { caption: m[1].trim(), ref: m[2] } : null
}

/**
 * Текст конспекта → абзацы для lessons.content.
 *
 * Ссылка `img:<key>`, которой нет в `images`, выбрасывается вместе с абзацем:
 * пустая рамка вместо картинки у ученика хуже, чем её отсутствие.
 */
export function theoryToParagraphs(
  theory: string,
  images: TheoryImage[] = [],
  idPrefix = 'p',
): LessonParagraph[] {
  const byKey = new Map(images.map(img => [img.key, img.src]))
  const out: LessonParagraph[] = []
  for (const chunk of theory.split(/\n\s*\n/)) {
    const text = chunk.trim()
    if (!text) continue
    const fig = parseFigureLine(text)
    if (!fig) {
      out.push({ id: `${idPrefix}-p${out.length + 1}`, text })
      continue
    }
    const src = fig.ref.startsWith('img:') ? byKey.get(fig.ref.slice(4)) : fig.ref
    if (!src) continue
    out.push({ id: `${idPrefix}-p${out.length + 1}`, text: fig.caption, image: src })
  }
  return out
}

/**
 * Абзацы из lessons.content → текст конспекта плюс список картинок.
 *
 * Обратная операция к theoryToParagraphs: нужна, когда сохранённый курс
 * открывают в редакторе заново. Без неё конспект (а с ним и картинки) терялся
 * бы при каждом повторном открытии.
 */
export function paragraphsToTheory(paragraphs: LessonParagraph[] = []): {
  theory: string
  images: TheoryImage[]
} {
  const images: TheoryImage[] = []
  const lines = paragraphs.map(p => {
    if (!p.image) return p.text
    const key = String(images.length + 1)
    images.push({ key, src: p.image })
    return figureMarker(p.text ?? '', `img:${key}`)
  })
  return { theory: lines.join('\n\n'), images }
}

/**
 * Вынести картинки, вписанные в текст целиком, в отдельный список.
 *
 * Так конспект приходит из сида: там картинка — результат функции-рисовалки, и
 * подставить её можно только значением. В редакторе она уже должна быть
 * ссылкой, иначе поле «Конспект» превращается в простыню data-URI.
 */
export function packTheoryImages(theory: string): { theory: string; images: TheoryImage[] } {
  const images: TheoryImage[] = []
  const lines = theory.split(/\n\s*\n/).map(chunk => {
    const text = chunk.trim()
    const fig = text ? parseFigureLine(text) : null
    // Ссылку `img:` не трогаем — она уже упакована.
    if (!fig || fig.ref.startsWith('img:')) return text
    const key = String(images.length + 1)
    images.push({ key, src: fig.ref })
    return figureMarker(fig.caption, `img:${key}`)
  })
  return { theory: lines.filter(Boolean).join('\n\n'), images }
}

/** Добавить картинку в конец конспекта — точка входа кнопки «Картинка». */
export function appendTheoryImage(
  theory: string,
  images: TheoryImage[],
  src: string,
  caption: string,
): { theory: string; images: TheoryImage[] } {
  // Ключ не переиспользуем после удаления: маркер мог остаться в тексте
  // строкой выше, и новая картинка встала бы на место старой.
  const nextKey = String(images.reduce((max, img) => Math.max(max, Number(img.key) || 0), 0) + 1)
  const next = [...images, { key: nextKey, src }]
  const marker = figureMarker(caption, `img:${nextKey}`)
  return { theory: theory.trim() ? `${theory.trim()}\n\n${marker}` : marker, images: next }
}

/** Убрать картинку и её маркер из конспекта. */
export function removeTheoryImage(
  theory: string,
  images: TheoryImage[],
  key: string,
): { theory: string; images: TheoryImage[] } {
  const kept = theory
    .split(/\n\s*\n/)
    .filter(chunk => {
      const fig = parseFigureLine(chunk.trim())
      return !(fig && fig.ref === `img:${key}`)
    })
    .map(chunk => chunk.trim())
    .filter(Boolean)
  return { theory: kept.join('\n\n'), images: images.filter(img => img.key !== key) }
}

/** Подпись картинки в тексте конспекта — для превью в списке иллюстраций. */
export function captionOf(theory: string, key: string): string {
  for (const chunk of theory.split(/\n\s*\n/)) {
    const fig = parseFigureLine(chunk.trim())
    if (fig && fig.ref === `img:${key}`) return fig.caption
  }
  return ''
}

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

/**
 * Конспект, разрезанный по картинкам: проза и картинки вперемешку.
 *
 * Редактору мало знать порядок — картинка должна стоять в самом поле ввода
 * ровно там, где стоит её маркер, иначе учитель пишет вслепую: текст сверху,
 * картинки отдельной полосой снизу. Поэтому текст режется на куски по
 * маркерам: между двумя картинками — один кусок прозы, и кусков всегда на один
 * больше, чем картинок (первый и последний могут быть пустыми).
 */
export interface TheoryCut {
  /** Проза между картинками; length === figures.length + 1. */
  segments: string[]
  figures: Array<{ key: string; caption: string }>
}

/** Разрезать конспект по маркерам картинок. */
export function cutTheoryAtFigures(theory: string): TheoryCut {
  const segments: string[] = []
  const figures: TheoryCut['figures'] = []
  let buf: string[] = []
  for (const chunk of theory.split(/\n\s*\n/)) {
    const text = chunk.trim()
    const fig = text ? parseFigureLine(text) : null
    if (fig && fig.ref.startsWith('img:')) {
      segments.push(buf.join('\n\n'))
      buf = []
      figures.push({ key: fig.ref.slice(4), caption: fig.caption })
      continue
    }
    if (text) buf.push(text)
  }
  segments.push(buf.join('\n\n'))
  return { segments, figures }
}

/** Собрать конспект обратно из прозы и картинок. */
export function joinTheoryAtFigures({ segments, figures }: TheoryCut): string {
  const out: string[] = []
  segments.forEach((seg, i) => {
    if (seg.trim()) out.push(seg.trim())
    const fig = figures[i]
    if (fig) out.push(figureMarker(fig.caption, `img:${fig.key}`))
  })
  return out.join('\n\n')
}

/** Переписать подпись картинки прямо в маркере. */
export function setFigureCaption(theory: string, key: string, caption: string): string {
  const cut = cutTheoryAtFigures(theory)
  return joinTheoryAtFigures({
    ...cut,
    figures: cut.figures.map(f => (f.key === key ? { ...f, caption } : f)),
  })
}

/**
 * Подвинуть картинку на один абзац вверх или вниз.
 *
 * Когда маркер виден в тексте, его двигают руками; в блочном редакторе строки
 * маркера нет, и без этого картинку нельзя переставить вообще.
 */
export function moveTheoryFigure(theory: string, key: string, dir: -1 | 1): string {
  const chunks = theory.split(/\n\s*\n/).map(c => c.trim()).filter(Boolean)
  const at = chunks.findIndex(c => {
    const fig = parseFigureLine(c)
    return !!fig && fig.ref === `img:${key}`
  })
  const to = at + dir
  if (at < 0 || to < 0 || to >= chunks.length) return theory
  const next = [...chunks]
  ;[next[at], next[to]] = [next[to], next[at]]
  return next.join('\n\n')
}

/** Картинка конспекта вместе с её местом в тексте. */
export interface PlacedTheoryImage {
  image: TheoryImage
  /** Подпись из маркера. */
  caption: string
  /** Номер по порядку в тексте (1, 2, …) или null, если маркера в тексте нет. */
  position: number | null
}

/**
 * Картинки в порядке их появления в конспекте.
 *
 * Список хранит их в порядке загрузки, а маркер учитель двигает по тексту —
 * поэтому «первая в списке» и «первая в уроке» расходятся. Полоса превью должна
 * читаться как сам урок, иначе по ней не понять, что за чем идёт. Картинки без
 * маркера уходят в конец: они нигде не показываются, и их место — «потеряшки».
 */
export function orderedTheoryImages(theory: string, images: TheoryImage[] = []): PlacedTheoryImage[] {
  const placed = new Map<string, { caption: string; position: number }>()
  for (const chunk of theory.split(/\n\s*\n/)) {
    const fig = parseFigureLine(chunk.trim())
    if (!fig || !fig.ref.startsWith('img:')) continue
    const key = fig.ref.slice(4)
    // Один и тот же ключ дважды — берём первое вхождение: оно и задаёт порядок.
    if (!placed.has(key)) placed.set(key, { caption: fig.caption, position: placed.size + 1 })
  }
  return images
    .map(image => {
      const hit = placed.get(image.key)
      return { image, caption: hit?.caption ?? '', position: hit ? hit.position : null }
    })
    // MAX_SAFE_INTEGER, а не Infinity: у двух «потеряшек» Infinity − Infinity = NaN,
    // и порядок сортировки ломается.
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
}

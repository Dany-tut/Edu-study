// Служебные абзацы конспекта (LessonParagraph.kind):
//   'sources' — источники норм: держат сверку автора, ученику не показываются;
//   'ask'     — «Вопрос по уроку»: рисуется карточкой LessonAskCard с кнопкой
//               обратной связи и заполненным разделом.
// Запасное распознавание по id и началу текста — для конспекта, сохранённого в
// базе до появления kind. Ссылки на нормы внутри текста уроков не трогаются.
import type { LessonParagraph } from '../data/lessonContent'

export const isSourcesPara = (p: LessonParagraph): boolean =>
  p.kind === 'sources' || (p.id === 'src' && /^Источники:/.test(p.text))

/** Раздел обратной связи для абзаца «Вопрос по уроку»; null — обычный абзац. */
export const askSectionOf = (p: LessonParagraph): string | null => {
  if (p.kind === 'ask') return p.section ?? ''
  if (p.id === 'comment' && p.text.startsWith('**Вопрос или комментарий к уроку.**')) {
    return /раздел «([^»]+)»/.exec(p.text)?.[1] ?? ''
  }
  return null
}

/** Конспект для ученика без служебных абзацев + раздел для карточки вопроса. */
export function splitServiceParas(paragraphs: LessonParagraph[]): { notes: LessonParagraph[]; askSection: string | null } {
  let askSection: string | null = null
  const notes = paragraphs.filter(p => {
    const ask = askSectionOf(p)
    if (ask !== null) { askSection ??= ask; return false }
    return !isSourcesPara(p)
  })
  return { notes, askSection }
}

// ─────────────────────────────────────────────────────────────────────────────
// Эталон в конспекте — только по явному запросу.
//
// ЗАЧЕМ. В конспекте урока стоит блок «Проверка себя / эталон» с готовыми
// числами, а домашка с теми же вопросами идёт после конспекта. Ученик, дочитав
// до задания, уже видел ответ: задание проверяет не навык, а память на
// последний абзац (см. память «задание не показывает свой ответ»). Требование
// пакета ТЗ курса «Бухгалтерия»: «не показывать эталон раньше попытки без
// явного запроса».
//
// ПОЧЕМУ ПО ТЕКСТУ, А НЕ ПОЛЕМ. Конспект живёт в `lessons.content` в базе и
// правится учителем в редакторе как обычный текст. Поле `reveal` у абзаца
// пришлось бы и завести в схему, и протащить через сиды и редактор, а учитель
// всё равно пишет заголовок «**Эталон.**» руками. Поэтому признак — сам
// заголовок абзаца, и правило работает для любого курса без переразметки.
//
// Два вида:
//   tap          — «**Проверка себя…**», «**Эталон…**»: свёрнут, раскрывается
//                  нажатием «Показать эталон».
//   after-submit — «**Разбор после сдачи…**»: закрыт, пока работа урока не
//                  сдана (итоговые проекты). После сдачи показывается разбором.
//
// Строка «— Проверка: эталон: …» внутри другого абзаца (блоки «Быстрее с ИИ»)
// сворачивается так же, отдельной строкой: остальной абзац остаётся виден.
// ─────────────────────────────────────────────────────────────────────────────
import type { LessonParagraph } from '../data/lessonContent'

export type RevealKind = 'tap' | 'after-submit'

// Заголовок абзаца: жирный кусок в самом начале. Точка/двоеточие в конце
// заголовка — пунктуация, а не часть подписи.
const LEAD = /^\*\*([^*\n]+?)\*\*[ \t]*/

const AFTER_SUBMIT = /^(разбор после сдачи|эталон после сдачи)/i
const TAP = /^(проверка себя|проверяем себя|эталон|self-check|answer key)/i
// «Задание «…» — эталон.»: заголовок задания, а под ним ответ к нему.
const TAP_TAIL = /[—–-]\s*эталон[.:]?$/i

/** Вид свёртки для абзаца или null — абзац показывается как есть. */
export function revealKind(text: string): RevealKind | null {
  const m = LEAD.exec(text.trimStart())
  if (!m) return null
  const head = m[1].trim()
  if (AFTER_SUBMIT.test(head)) return 'after-submit'
  if (TAP.test(head) || TAP_TAIL.test(head)) return 'tap'
  return null
}

/** Подпись блока из заголовка абзаца и текст без заголовка. */
export function splitHead(text: string): { title: string; body: string } {
  const src = text.trimStart()
  const m = LEAD.exec(src)
  if (!m) return { title: '', body: text }
  return { title: m[1].trim().replace(/[.:]\s*$/, ''), body: src.slice(m[0].length) }
}

export type NoteBlock =
  | { kind: 'plain'; para: LessonParagraph }
  | { kind: RevealKind; id: string; title: string; body: string; figures: LessonParagraph[] }

/**
 * Конспект → блоки. Схема, прикреплённая к абзацу эталона (`<id>-figN`, так их
 * вставляет withFigures), уезжает в свёртку вместе с ним: таблица ответов на
 * картинке — тот же эталон.
 */
export function groupNotes(paragraphs: LessonParagraph[]): NoteBlock[] {
  const out: NoteBlock[] = []
  for (const para of paragraphs) {
    const last = out[out.length - 1]
    if (para.image && last && last.kind !== 'plain' && para.id.startsWith(`${last.id}-fig`)) {
      last.figures.push(para)
      continue
    }
    const kind = !para.image && !para.reactionId ? revealKind(para.text) : null
    if (!kind) { out.push({ kind: 'plain', para }); continue }
    const { title, body } = splitHead(para.text)
    out.push({ kind, id: para.id, title, body, figures: [] })
  }
  return out
}

// «— Проверка: эталон: НДФЛ 7 800; …» — эталон посреди абзаца.
const INLINE = /^((?:[—–-]\s*)?Проверка:\s*)эталон:\s*/i

export type InlineSegment = { kind: 'text'; text: string } | { kind: 'reveal'; lead: string; text: string }

/** Абзац → куски: обычный текст и строки с эталоном. Без эталона — один кусок. */
export function splitInlineReveals(text: string): InlineSegment[] {
  if (!/эталон:/i.test(text)) return [{ kind: 'text', text }]
  const out: InlineSegment[] = []
  let buf: string[] = []
  const flush = () => { if (buf.length) out.push({ kind: 'text', text: buf.join('\n') }); buf = [] }
  for (const line of text.split('\n')) {
    const m = INLINE.exec(line.trimStart())
    if (!m) { buf.push(line); continue }
    flush()
    out.push({ kind: 'reveal', lead: m[1].trim(), text: line.trimStart().slice(m[0].length) })
  }
  flush()
  return out
}

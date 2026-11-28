import { Fragment, useState, type ReactNode } from 'react'
import { Check, Copy } from './icons/appIcons'
import { t } from '../lib/i18n'
import { BREAK_SPACE, keepsTogether, tidyProse } from '../lib/typography'
import { BOLD_WEIGHT, parseBold } from '../lib/markup'

// Учебный текст с правильными переносами.
//
// Почему компонент, а не строка: см. «Связки в разметке» в lib/typography.
// Коротко — WebKit на телефоне рвёт строку после открывающей кавычки, и
// невидимые знаки-склейки его не останавливают; останавливает только
// white-space: nowrap на куске разметки. Поэтому текст доезжает до экрана не
// строкой, а набором кусков: между ними обычные пробелы (по ним и переносим),
// внутри — слово со своими знаками и связка из bindShortWords.
//
// Всё остальное (какие слова склеивать, какие знаки к какому слову относятся)
// живёт в lib/typography и здесь не повторяется.

/**
 * Куски текста, готовые к показу. Отдельной функцией — чтобы вставлять их
 * в уже собранную разметку (подсветка уравнения в конспекте).
 *
 * Текст ожидается УЖЕ причёсанным (tidyProse); `<Prose>` делает это сам.
 */
export function proseNodes(text: string, keyPrefix = 'p'): ReactNode[] {
  return text.split(BREAK_SPACE).map((chunk, i) => (
    // Нечётные куски — сами пробелы: они и есть места переноса, их отдаём как
    // есть. Слишком длинную связку не запрещаем — она уехала бы за край.
    i % 2 === 1 || !keepsTogether(chunk)
      ? <Fragment key={`${keyPrefix}${i}`}>{chunk}</Fragment>
      : <span key={`${keyPrefix}${i}`} style={{ whiteSpace: 'nowrap' }}>{chunk}</span>
  ))
}

// Формула или код в обратных кавычках: `=СУММЕСЛИ(B:B;"Альфа";D:D)`.
//
// ЗАЧЕМ. Курс «Бухгалтерия» даёт формулы, которые надо вставить в Excel ровно
// как написано: кавычки, `$`, `;`. Типографика учебного текста вставляет в
// строку невидимые склейки и меняет кавычки — скопированная из абзаца формула
// перестала бы работать. Поэтому код обходит tidyProse целиком, рисуется
// моноширинно и копируется кнопкой из исходной строки.
//
// Строка, состоящая только из кода, — блок с кнопкой «Копировать» (кнопка
// видна всегда: на телефоне и айпаде нет наведения). Код посреди фразы —
// короткая вставка без кнопки. Переносится по любому знаку, чтобы длинная
// формула не давала горизонтальной прокрутки в шторке конспекта.
const CODE_SPLIT = /(`[^`\n]+`)/
const isCode = (s: string) => s.length > 2 && s.startsWith('`') && s.endsWith('`')

// Промпт для ИИ в обратных кавычках — это текст, а не формула: обычный шрифт
// и перенос по словам. Формула начинается с «=» или короче шести слов.
const isPromptText = (code: string) => !code.trimStart().startsWith('=') && code.trim().split(/\s+/).length >= 6

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }).catch(() => { /* нет доступа к буферу — текст видно, его можно выделить */ })
  }
  return { copied, copy }
}

// Формула — чип в тон курса, а не серая плашка «как в редакторе»: заливка и
// текст из токенов оттенка курса (courseTint считает их под AA в обеих темах),
// обводка того же оттенка. Inline-код, блок и промпт — одно семейство.
const CHIP = {
  background: 'var(--color-purple-soft)',
  border: '1px solid rgba(var(--accent-rgb), 0.28)',
  color: 'var(--color-purple-text)',
} as const
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

function CodeBlock({ code, block }: { code: string; block: boolean }) {
  const { copied, copy } = useCopy(code)
  if (!block) {
    // Формула посреди фразы (в т. ч. «Англ.: =IFERROR(…)»): клик по чипу
    // копирует, на мгновение показывая галочку.
    return (
      <code
        role="button"
        tabIndex={0}
        onClick={copy}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy() } }}
        title={copied ? t('Скопировано') : t('Копировать')}
        style={{
          ...CHIP, fontFamily: MONO, fontSize: '0.9em', fontWeight: 500, borderRadius: '0.45em',
          padding: '0.08em 0.4em', cursor: 'copy', wordBreak: 'break-all', whiteSpace: 'pre-wrap',
          boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
        }}
      >
        {code}
        {copied && <Check size="0.95em" style={{ marginLeft: '0.3em', verticalAlign: '-0.12em', color: 'var(--color-green-text)' }} />}
      </code>
    )
  }
  return <CopyBox text={code} prompt={isPromptText(code)} copied={copied} copy={copy} />
}

/**
 * Блок с кнопкой «Копировать» в правом верхнем углу, вровень с первой строкой.
 * Все размеры — в em шрифта конспекта, поэтому при «Крупном тексте» блок,
 * кнопка и иконка растут вместе. Формула — моноширинная (0.9em) с переносом
 * по любому знаку, промпт — обычный шрифт и перенос по словам.
 */
function CopyBox({ text, prompt, copied, copy }: { text: string; prompt: boolean; copied: boolean; copy: () => void }) {
  const fs = prompt ? 1 : 0.9, lh = prompt ? 1.5 : 1.45
  const padY = 0.45, btn = 1.7
  // Высоту строки задаёт внешний блок (шрифт абзаца × lh), даже когда сама
  // формула набрана 0.9em, — по ней и центрируем кнопку.
  const btnTop = `calc(${(padY + (lh - btn) / 2).toFixed(3)}em + 1px)`
  return (
    <span style={{ display: 'block', position: 'relative', margin: '0.2em 0' }}>
      <span style={{
        ...CHIP, display: 'block', borderRadius: '0.65em', lineHeight: lh,
        padding: `${padY}em calc(${btn + 0.6}em) ${padY}em 0.65em`,
        ...(prompt
          ? { fontFamily: 'inherit', fontSize: '1em', overflowWrap: 'break-word' as const, whiteSpace: 'pre-wrap' as const }
          : { fontFamily: MONO, fontWeight: 500, wordBreak: 'break-all' as const, whiteSpace: 'pre-wrap' as const }),
      }}>
        {prompt ? text : <code style={{ fontFamily: 'inherit', fontSize: `${fs}em` }}>{text}</code>}
      </span>
      <button
        type="button"
        data-hover="layer"
        onClick={copy}
        aria-label={copied ? t('Скопировано') : t('Копировать')}
        title={copied ? t('Скопировано') : t('Копировать')}
        style={{
          position: 'absolute', top: btnTop, right: '0.35em',
          width: `${btn}em`, height: `${btn}em`, borderRadius: '0.5em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'inherit', lineHeight: 1, padding: 0,
          border: '1px solid rgba(var(--accent-rgb), 0.28)', background: 'var(--color-bg-card)',
          color: copied ? 'var(--color-green-text)' : 'var(--color-purple-text)',
        }}
      >
        {copied ? <Check size="1em" /> : <Copy size="1em" />}
      </button>
    </span>
  )
}

// «**Готовый промпт для ИИ.** «текст промпта» хвост». Промпт в ёлочках —
// отдельный блок с копированием; вложенные «…» внутри промпта учитываются.
const READY_PROMPT = /^(\*\*Готовый промпт[^*]*\*\*\s*)«/
function splitReadyPrompt(text: string): [string, string, string] | null {
  const m = READY_PROMPT.exec(text)
  if (!m) return null
  let depth = 0
  for (let i = m[1].length; i < text.length; i++) {
    if (text[i] === '«') depth++
    else if (text[i] === '»' && --depth === 0) return [m[1], text.slice(m[1].length + 1, i), text.slice(i + 1)]
  }
  return null
}

function PromptCopy({ text }: { text: string }) {
  const { copied, copy } = useCopy(text)
  return <CopyBox text={text} prompt copied={copied} copy={copy} />
}

/** Абзац учебного текста: причёсан и разрезан на неразрывные связки. */
export default function Prose({ text }: { text: string }) {
  const ready = splitReadyPrompt(text)
  if (ready) {
    const [lead, prompt, tail] = ready
    return <><ProseText text={lead.trimEnd()} /><PromptCopy text={prompt.replace(/`/g, '')} />{tail.trim() && <ProseText text={tail.trim()} />}</>
  }
  if (text.includes('`')) {
    const parts = text.split(CODE_SPLIT).filter(Boolean)
    if (parts.some(isCode)) {
      const block = parts.filter(s => s.trim()).length === 1
      return <>{parts.map((s, i) => isCode(s)
        ? <CodeBlock key={i} code={s.slice(1, -1)} block={block} />
        : <ProseText key={i} text={s} />)}</>
    }
  }
  return <ProseText text={text} />
}

function ProseText({ text }: { text: string }) {
  // Выделение снимаем ПОСЛЕ типографики: она вставляет в текст невидимые
  // склейки, и границы, посчитанные до неё, разъехались бы на эти знаки.
  const { text: clean, bold } = parseBold(tidyProse(text))
  if (!bold.length) return <>{proseNodes(clean)}</>

  const out: ReactNode[] = []
  let at = 0
  bold.forEach((run, i) => {
    if (run.start > at) out.push(<Fragment key={`n${i}`}>{proseNodes(clean.slice(at, run.start), `n${i}`)}</Fragment>)
    out.push(
      <strong key={`b${i}`} style={{ fontWeight: BOLD_WEIGHT }}>
        {proseNodes(clean.slice(run.start, run.end), `b${i}`)}
      </strong>,
    )
    at = run.end
  })
  if (at < clean.length) out.push(<Fragment key="tail">{proseNodes(clean.slice(at), 'tail')}</Fragment>)
  return <>{out}</>
}

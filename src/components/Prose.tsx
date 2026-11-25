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

function CodeBlock({ code, block }: { code: string; block: boolean }) {
  const [copied, setCopied] = useState(false)
  const style = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.9em',
    background: 'var(--color-bg-3)',
    border: '1px solid var(--color-border-soft)',
    borderRadius: 6,
    color: 'var(--color-text)',
    wordBreak: 'break-all' as const,
    whiteSpace: 'pre-wrap' as const,
  }
  if (!block) return <code style={{ ...style, padding: '1px 5px' }}>{code}</code>
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }).catch(() => { /* нет доступа к буферу — формулу видно, её можно выделить */ })
  }
  return (
    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '2px 0' }}>
      <code style={{ ...style, flex: 1, minWidth: 0, padding: '8px 10px', display: 'block', lineHeight: 1.45 }}>{code}</code>
      <button
        type="button"
        data-hover="layer"
        onClick={copy}
        aria-label={copied ? t('Скопировано') : t('Копировать')}
        title={copied ? t('Скопировано') : t('Копировать')}
        style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card)',
          color: copied ? 'var(--color-green-text)' : 'var(--color-muted)',
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </span>
  )
}

/** Абзац учебного текста: причёсан и разрезан на неразрывные связки. */
export default function Prose({ text }: { text: string }) {
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

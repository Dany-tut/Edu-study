import { Fragment, type ReactNode } from 'react'
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

/** Абзац учебного текста: причёсан и разрезан на неразрывные связки. */
export default function Prose({ text }: { text: string }) {
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

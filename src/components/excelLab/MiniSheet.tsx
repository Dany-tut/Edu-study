// Мини-таблица Excel-лаборатории: несмежные блоки листа одной таблицей с
// разрывами «…», только занятые столбцы, подсветка ячеек, правка значений.
// Широкая таблица прокручивается по горизонтали с фейдами (SCROLL-01).

import { useMemo, useState, type ReactNode } from 'react'
import HScrollFade from '../HScrollFade'
import { addr, colToNum, display, isErr, numToCol, parseAddr, type Workbook, type XlValue } from '../../lib/excelLab/formula'

export type CellMark = { color?: number; tint?: boolean; match?: boolean; changed?: boolean; note?: string }

/** Ключ ячейки в карте отметок: 'Лист!A1'. */
export const cellKey = (sheet: string, a: string) => sheet + '!' + a

function layout(wb: Workbook, sheet: string) {
  const keys = [...(wb.cells.get(sheet)?.keys() ?? [])].map(k => parseAddr(k)!).filter(Boolean)
  const cols = [...new Set(keys.map(k => k.c))].sort((a, b) => a - b)
  const rows = [...new Set(keys.map(k => k.r))].sort((a, b) => a - b)
  return { cols, rows }
}

/** Подпись столбца из заголовков автора: 'D' или 'Лист!D'. */
function headerOf(headers: Record<string, string> | undefined, sheet: string, col: string, main: string) {
  if (!headers) return undefined
  return headers[`${sheet}!${col}`] ?? (sheet === main ? headers[col] : undefined)
}

export default function MiniSheet({
  wb, sheet, marks, editable, onEdit, headers, label,
}: {
  wb: Workbook
  sheet: string
  marks?: Map<string, CellMark>
  /** Ключи 'Лист!A1' ячеек, которые можно менять. */
  editable?: Set<string>
  onEdit?: (key: string, value: XlValue) => void
  headers?: Record<string, string>
  label?: string
}) {
  const { cols, rows } = useMemo(() => layout(wb, sheet), [wb, sheet])
  const [draft, setDraft] = useState<Record<string, string>>({})

  const head: ReactNode[] = [<th key="rn" className="rn" aria-hidden />]
  cols.forEach((c, i) => {
    if (i > 0 && c !== cols[i - 1] + 1) head.push(<th key={'g' + c} className="gap" aria-hidden>…</th>)
    const L = numToCol(c)
    const h = headerOf(headers, sheet, L, wb.main)
    head.push(<th key={c} scope="col">{L}{h && <span>{h}</span>}</th>)
  })

  const body: ReactNode[] = []
  rows.forEach((r, i) => {
    if (i > 0 && r !== rows[i - 1] + 1) body.push(
      <tr key={'g' + r} aria-hidden><td className="gap rn">…</td><td className="gap" colSpan={head.length - 1} /></tr>,
    )
    const tds: ReactNode[] = [<th key="rn" scope="row" className="rn">{r}</th>]
    cols.forEach((c, j) => {
      if (j > 0 && c !== cols[j - 1] + 1) tds.push(<td key={'g' + c} className="gap" aria-hidden />)
      const a = addr(c, r)
      const key = cellKey(sheet, a)
      const raw = wb.raw(sheet, a)
      const isFormula = typeof raw === 'string' && raw.startsWith('=')
      const val = isFormula ? wb.value(sheet, a) : raw
      const shown = display(val)
      const m = marks?.get(key)
      const cls = m?.color ? `xl-cell xl-c${m.color} xl-b${m.color}` : 'xl-cell'
      const canEdit = !!editable?.has(key) && !!onEdit
      const num = typeof val === 'number'
      tds.push(
        <td key={c} className={cls}
          data-num={num || undefined} data-formula={isFormula || undefined}
          data-hl={m?.color && !m.tint ? '' : undefined} data-tint={m?.tint ? '' : undefined}
          data-match={m?.match || undefined} data-changed={m?.changed || undefined}
          data-err={isErr(val) || undefined}
          title={isFormula ? String(raw) : undefined}
        >
          {canEdit ? (
            <input
              aria-label={`Ячейка ${sheet === wb.main ? '' : sheet + '!'}${a}`}
              inputMode={typeof raw === 'number' || raw === null ? 'decimal' : 'text'}
              value={draft[key] ?? (raw === null ? '' : typeof raw === 'number' ? display(raw).replace(/ /g, '') : String(raw))}
              onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
              onBlur={e => { commit(key, e.target.value); setDraft(d => { const n = { ...d }; delete n[key]; return n }) }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              onInput={e => commit(key, (e.target as HTMLInputElement).value)}
            />
          ) : <span className="t">{shown}</span>}
          {m?.note && <span className="xl-note">{m.note}</span>}
        </td>,
      )
    })
    body.push(<tr key={r}>{tds}</tr>)
  })

  function commit(key: string, text: string) {
    const t = text.trim()
    const n = Number(t.replace(/[\s ]/g, '').replace(',', '.').replace('−', '-'))
    onEdit?.(key, t === '' ? null : !isNaN(n) && /\d/.test(t) && !/[A-Za-zА-Яа-я]/.test(t) ? n : t)
  }

  return (
    <HScrollFade padTop={0} padBottom={2} fadeWidth={28}>
      <table className="xl-grid" aria-label={label ?? `Лист «${sheet}»`}>
        <thead><tr>{head}</tr></thead>
        <tbody>{body}</tbody>
      </table>
    </HScrollFade>
  )
}

/** Отметить ячейки диапазонов цветом: refs вида 'A:A', 'E2', 'Декрет!A2:B6'. */
export function markRefs(wb: Workbook, refs: string[], color: number, into = new Map<string, CellMark>(), current = wb.main) {
  for (const ref of refs) {
    const bang = ref.lastIndexOf('!')
    const sheet = bang > 0 ? ref.slice(0, bang).replace(/^'(.*)'$/, '$1') : current
    const body = ref.slice(bang + 1).replace(/\$/g, '').toUpperCase()
    const [p, q] = body.split(':')
    const whole = /^[A-Z]+$/.test(p)
    const start = whole ? { c: colToNum(p), r: 1 } : parseAddr(p)
    const end = q ? (whole ? { c: colToNum(q), r: 1e9 } : parseAddr(q)) : start
    if (!start || !end) continue
    const single = !q
    for (const k of wb.cells.get(sheet)?.keys() ?? []) {
      const x = parseAddr(k)!
      if (x.c >= start.c && x.c <= end.c && x.r >= start.r && x.r <= end.r) {
        const key = cellKey(sheet, k)
        into.set(key, { ...into.get(key), color, tint: !single })
      }
    }
    if (single) { const key = cellKey(sheet, addr(start.c, start.r)); into.set(key, { ...into.get(key), color, tint: false }) }
  }
  return into
}

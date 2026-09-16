import { useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { DEFAULT_IMAGE_SIZE } from '../data/taskTypes'
import GrowTextarea from './GrowTextarea'

// ─────────────────────────────────────────────────────────────────────────────
// QuestionTable — ONE table renderer for every surface (trainer, homework,
// tests, constructor preview). Shared data model → shared look.
//
//  • Width: hugs the text, never wider than its container. Text that doesn't
//    fit wraps onto the next line inside the cell (whole words; a single word
//    longer than the column is the only thing that breaks).
//  • A column can't be narrower than its longest word, so on a very narrow
//    screen the box still scrolls horizontally as a last resort.
//
// Cells: plain text · blank "—" · fill-in box (emptyCells, interactive) · image.
// Fill-in supports a JSON blob (homework) or per-cell accessors (tests), and
// blankAsInput makes blank cells fillable too (tests).
// ─────────────────────────────────────────────────────────────────────────────

export type QTable = {
  headers: string[]
  rows: string[][]
  emptyCells?: Record<string, boolean>
  blankCells?: Record<string, boolean>
  cellImages?: Record<string, string>
  cellImageSizes?: Record<string, number>
}

export default function QuestionTable({
  table, mobile = false, interactive = false, value, onChange, disabled = false,
  cellValue, onCellChange, blankAsInput = false, accent,
}: {
  table: QTable
  mobile?: boolean
  interactive?: boolean
  value?: string
  onChange?: (v: string) => void
  cellValue?: (key: string) => string
  onCellChange?: (key: string, v: string) => void
  blankAsInput?: boolean
  disabled?: boolean
  /** Цвет вписанного ответа и каретки — акцент теста/предмета; по умолчанию акцент кабинета. */
  accent?: string
}) {
  const t = useT()
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const onScroll = () => {
    const el = boxRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }

  useLayoutEffect(() => {
    onScroll()
    const ro = new ResizeObserver(onScroll)
    if (boxRef.current) ro.observe(boxRef.current)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [table])

  // Fill-in answers: JSON blob (value/onChange) or per-cell (cellValue/onCellChange).
  let vals: Record<string, string> = {}
  try { if (value) vals = JSON.parse(value) } catch { vals = {} }
  const getVal = (key: string) => cellValue ? cellValue(key) : (vals[key] ?? '')
  const putVal = (key: string, v: string) =>
    onCellChange ? onCellChange(key, v) : onChange?.(JSON.stringify({ ...vals, [key]: v }))

  const border = '1px solid var(--color-border-medium)'
  const padY = mobile ? 7 : 9
  const padX = mobile ? 10 : 14
  const cellPad = `${padY}px ${padX}px`

  function renderCell(cell: string, r: number, c: number) {
    const key = `${r},${c}`
    const isEmpty = !!table.emptyCells?.[key]
    const isBlank = !!table.blankCells?.[key]
    const img = table.cellImages?.[key]
    const imgSize = table.cellImageSizes?.[key] ?? DEFAULT_IMAGE_SIZE
    const fillable = interactive && (isEmpty || (blankAsInput && isBlank))
    if (fillable) {
      return (
        // Длинный ответ переносится и раздвигает строку, а не уезжает за край ячейки.
        // Паддинг в calc(): так GrowTextarea не поднимает текст на 0.12em — в строке
        // таблицы важнее ровная линия с соседней ячейкой, чем оптический центр поля.
        <GrowTextarea
          value={getVal(key)}
          onChange={v => putVal(key, v.replace(/\n/g, ' '))}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          disabled={disabled}
          placeholder={t('Впиши…')}
          style={{ display: 'block', width: '100%', minWidth: 84, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', paddingTop: `calc(${padY}px)`, paddingBottom: `calc(${padY}px)`, paddingLeft: padX, paddingRight: padX, fontFamily: 'inherit', fontSize: mobile ? 16 : 13, lineHeight: 'inherit', color: accent ?? 'var(--color-accent)', caretColor: accent ?? 'var(--color-accent)', fontWeight: mobile ? 500 : 600 }}
        />
      )
    }
    if (isEmpty) return <div style={{ padding: cellPad, minWidth: 48, minHeight: 20 }}>&nbsp;</div>
    if (isBlank) return <div style={{ padding: cellPad, color: 'var(--color-text-4)' }}>—</div>
    if (img) return (
      <div style={{ padding: '6px 8px' }}>
        <img src={img} alt="" style={{ display: 'block', width: `${imgSize}%`, borderRadius: 6 }} />
        {cell && <div style={{ padding: '4px 2px', color: 'var(--color-text-2)', fontSize: mobile ? 12 : 13 }}>{cell}</div>}
      </div>
    )
    return <div style={{ padding: cellPad, color: 'var(--color-text)' }}>{cell}</div>
  }

  return (
    <div style={{ position: 'relative', alignSelf: 'flex-start', width: 'fit-content', maxWidth: '100%' }}>
      <div
        ref={boxRef}
        className="no-scrollbar"
        onScroll={onScroll}
        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 16, border, maxWidth: '100%' }}
      >
        {/* На телефоне 15px: поле ответа там 16px (меньше — iOS зумит страницу при фокусе), и при 13px в ячейках ответ выглядел вдвое крупнее соседей */}
        <table ref={tableRef} style={{ borderCollapse: 'collapse', fontSize: mobile ? 15 : 13 }}>
          <thead>
            <tr>{table.headers.map((h, c) => (
              <th key={c} style={{ borderBottom: border, borderRight: c < table.headers.length - 1 ? border : undefined, padding: cellPad, fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', verticalAlign: 'top', overflowWrap: 'break-word' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} style={{ background: r % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>
                {row.map((cell, c) => {
                  const key = `${r},${c}`
                  const cellFillable = interactive && (table.emptyCells?.[key] || (blankAsInput && table.blankCells?.[key]))
                  return (
                    <td key={c} style={{
                      borderTop: '1px solid var(--color-border)', borderRight: c < row.length - 1 ? '1px solid var(--color-border)' : undefined,
                      padding: 0, verticalAlign: 'top', overflowWrap: 'break-word',
                      background: cellFillable ? 'var(--color-bg-input)' : undefined,
                      color: 'var(--color-text)',
                    }}>
                      {renderCell(cell, r, c)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scroll-hint fades — only when a column's longest word still can't fit. */}
      {!atEnd && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, right: 1, width: 24, borderRadius: '0 15px 15px 0', pointerEvents: 'none', background: 'linear-gradient(to left, var(--color-bg), transparent)' }} />
      )}
      {!atStart && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, width: 18, borderRadius: '15px 0 0 15px', pointerEvents: 'none', background: 'linear-gradient(to right, var(--color-bg), transparent)' }} />
      )}
    </div>
  )
}

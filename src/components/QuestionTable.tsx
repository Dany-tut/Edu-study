import { useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// QuestionTable — ONE table renderer for every surface (trainer, homework,
// tests, constructor preview). Data model is shared (task.questionTable), so the
// look should be too. Two presentations, chosen by viewport — not by surface:
//
//  • Desktop: sized to content but capped at ~half the width (neofamily-style),
//    never stretched full-bleed, no horizontal scroll.
//  • Mobile: two modes toggled by the ⤢ button —
//      1. "fit"  → table-layout:fixed, wraps into the screen width (no scroll)
//      2. "zoom" → natural size, scrolls left/right, with a sticky first column
//         and a fade hint at the right edge while there's more to reveal.
//
// Cells can be: plain text · blank "—" (blankCells) · a fill-in box the student
// types into (emptyCells, interactive) · an image (cellImages). All preserved.
// ─────────────────────────────────────────────────────────────────────────────

export type QTable = {
  headers: string[]
  rows: string[][]
  emptyCells?: Record<string, boolean>
  blankCells?: Record<string, boolean>
  cellImages?: Record<string, string>
  cellImageSizes?: Record<string, number>
}

// Desktop cap — a wide table sits at most ~half the reading column, like the
// competitor's; content narrower than this just uses its own width.
const DESKTOP_MAX = 560

export default function QuestionTable({
  table, mobile = false, interactive = false, value, onChange, disabled = false,
  cellValue, onCellChange, blankAsInput = false,
}: {
  table: QTable
  mobile?: boolean
  interactive?: boolean
  // Fill-in answers: either a single JSON blob (value/onChange, used by homework)
  // or per-cell accessors (cellValue/onCellChange, used by tests which keep a
  // flat answer map). blankAsInput makes blank cells fillable too (tests).
  value?: string
  onChange?: (v: string) => void
  cellValue?: (key: string) => string
  onCellChange?: (key: string, v: string) => void
  blankAsInput?: boolean
  disabled?: boolean
}) {
  const [zoom, setZoom] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const wrap = mobile && !zoom            // fit-to-block: cells wrap, no scroll
  const scrollable = mobile && zoom       // natural size, horizontal scroll

  // Parsed fill-in answers (homework stores them as a JSON blob keyed "r,c").
  let vals: Record<string, string> = {}
  try { if (value) vals = JSON.parse(value) } catch { vals = {} }
  const getVal = (key: string) => cellValue ? cellValue(key) : (vals[key] ?? '')
  const putVal = (key: string, v: string) =>
    onCellChange ? onCellChange(key, v) : onChange?.(JSON.stringify({ ...vals, [key]: v }))

  // Track scroll position so the right-edge fade only shows while more table
  // remains to the right (and a matching left fade once scrolled in).
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])
  const syncFades = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  const border = '1px solid var(--color-border-medium)'
  const cellPad = mobile ? '7px 10px' : '9px 14px'

  // First column is sticky only in the scrollable zoom mode, so row labels stay
  // visible while the rest of the table slides under them.
  const stickyCol = (j: number, isHeader: boolean): React.CSSProperties =>
    scrollable && j === 0
      ? { position: 'sticky', left: 0, zIndex: isHeader ? 3 : 1, background: isHeader ? 'var(--color-table-header-bg)' : 'var(--color-bg)', boxShadow: '1px 0 0 var(--color-border-medium)' }
      : {}

  function renderCell(cell: string, r: number, c: number) {
    const key = `${r},${c}`
    const isEmpty = !!table.emptyCells?.[key]
    const isBlank = !!table.blankCells?.[key]
    const img = table.cellImages?.[key]
    const imgSize = table.cellImageSizes?.[key] ?? 50
    const fillable = interactive && (isEmpty || (blankAsInput && isBlank))
    if (fillable) {
      return (
        <input
          value={getVal(key)}
          onChange={e => putVal(key, e.target.value)}
          disabled={disabled}
          placeholder="Впиши…"
          // fontSize 16 avoids iOS zoom-on-focus on the phone
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: cellPad, fontFamily: 'inherit', fontSize: mobile ? 16 : 13, color: 'var(--color-accent)', fontWeight: 600 }}
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
    <div style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: mobile ? '100%' : DESKTOP_MAX, width: mobile ? '100%' : 'fit-content' }}>
      <div
        ref={syncFades}
        onScroll={onScroll}
        style={{ overflowX: scrollable ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch', borderRadius: 16, border, maxWidth: '100%' }}
      >
        <table style={{
          borderCollapse: 'collapse',
          width: scrollable ? 'max-content' : '100%',
          minWidth: scrollable ? '100%' : undefined,
          // fixed layout forces columns to share the block width (so they wrap);
          // desktop also uses it under the cap so nothing overflows.
          tableLayout: scrollable ? undefined : 'fixed',
          fontSize: mobile ? 12 : 13,
        }}>
          <thead>
            <tr>{table.headers.map((h, c) => (
              <th key={c} style={{
                borderBottom: border, borderRight: c < table.headers.length - 1 ? border : undefined,
                padding: cellPad, fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left',
                whiteSpace: scrollable ? 'nowrap' : 'normal', wordBreak: scrollable ? undefined : 'break-word',
                ...stickyCol(c, true),
              }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} style={{ background: r % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>
                {row.map((cell, c) => {
                  const key = `${r},${c}`
                  const fillable = interactive && (table.emptyCells?.[key] || (blankAsInput && table.blankCells?.[key]))
                  return (
                  <td key={c} style={{
                    borderTop: '1px solid var(--color-border)', borderRight: c < row.length - 1 ? '1px solid var(--color-border)' : undefined,
                    padding: 0, verticalAlign: 'top',
                    whiteSpace: scrollable ? 'nowrap' : 'normal', wordBreak: scrollable ? undefined : 'break-word',
                    background: fillable ? 'var(--color-bg-input)' : undefined,
                    ...stickyCol(c, false),
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

      {/* Right / left scroll-hint fades — only in the scrollable zoom mode */}
      {scrollable && !atEnd && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, right: 1, width: 28, borderRadius: '0 15px 15px 0', pointerEvents: 'none', background: 'linear-gradient(to left, var(--color-bg), transparent)' }} />
      )}
      {scrollable && !atStart && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, width: 20, borderRadius: '15px 0 0 15px', pointerEvents: 'none', background: 'linear-gradient(to right, var(--color-bg), transparent)' }} />
      )}

      {/* Fit ↔ zoom toggle (mobile only) */}
      {mobile && (
        <button
          onClick={() => setZoom(z => !z)}
          aria-label={zoom ? 'Вписать таблицу' : 'Увеличить таблицу'}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 4,
            width: 32, height: 32, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--glass-rgb), 0.72)',
            backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill)',
            cursor: 'pointer', color: 'var(--color-text-2)',
          }}
        >
          {zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
        </button>
      )}
    </div>
  )
}

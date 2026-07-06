import { useLayoutEffect, useRef, useState } from 'react'
import { Minimize2, Maximize2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// QuestionTable — ONE table renderer for every surface (trainer, homework,
// tests, constructor preview). Shared data model → shared look.
//
//  • Mobile default: the table keeps its natural size and scrolls horizontally.
//  • Mobile "сжать" (⤢): instead of reflowing/wrapping text (which chops words
//    mid-letter), the whole table is scaled DOWN proportionally to fit the
//    screen width — one clean overview, nothing breaks.
//  • Desktop: natural size, capped at ~half the column; scrolls if wider.
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

const DESKTOP_MAX = 560

export default function QuestionTable({
  table, mobile = false, interactive = false, value, onChange, disabled = false,
  cellValue, onCellChange, blankAsInput = false,
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
}) {
  // Mobile only: false = scroll (natural), true = shrink-to-fit (scaled down).
  const [compact, setCompact] = useState(false)
  const [scale, setScale] = useState(1)
  const [natH, setNatH] = useState<number | undefined>(undefined)
  const [natW, setNatW] = useState<number | undefined>(undefined)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const fitting = mobile && compact

  // Measure natural size and derive the shrink factor. Transforms don't change
  // layout metrics, so scrollWidth stays the true natural width even while
  // scaled — the measurement never fights the scale it produces.
  useLayoutEffect(() => {
    const measure = () => {
      const t = tableRef.current, box = boxRef.current
      if (!t || !box) return
      if (fitting) {
        // offsetWidth includes borders — scrollWidth underestimates a
        // border-collapsed table and leaves it a few px too wide (last column
        // clipped by the box). Use offsetWidth so the scaled table fits exactly.
        const natural = t.offsetWidth
        // Shrink to a hair under the available width so a sub-pixel measurement
        // lag can never leave the last column clipped by the box edge.
        const avail = box.clientWidth - 2
        if (natural > avail) { setScale(avail / natural); setNatH(t.offsetHeight); setNatW(natural) }
        else { setScale(1); setNatH(undefined); setNatW(undefined) }
      } else {
        setScale(1); setNatH(undefined); setNatW(undefined)
        // Prime the scroll fades: show the right one when the table overflows.
        setAtStart(box.scrollLeft <= 1)
        setAtEnd(box.scrollLeft + box.clientWidth >= box.scrollWidth - 1)
      }
    }
    measure()
    // Observe BOTH the box (available width) and the table (its natural width
    // can settle later — fonts, images) so the fit scale never stays stale.
    const ro = new ResizeObserver(measure)
    if (boxRef.current) ro.observe(boxRef.current)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [fitting, mobile, table])

  const scaled = scale < 1

  // Fill-in answers: JSON blob (value/onChange) or per-cell (cellValue/onCellChange).
  let vals: Record<string, string> = {}
  try { if (value) vals = JSON.parse(value) } catch { vals = {} }
  const getVal = (key: string) => cellValue ? cellValue(key) : (vals[key] ?? '')
  const putVal = (key: string, v: string) =>
    onCellChange ? onCellChange(key, v) : onChange?.(JSON.stringify({ ...vals, [key]: v }))

  const border = '1px solid var(--color-border-medium)'
  const cellPad = mobile ? '7px 10px' : '9px 14px'

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
          style={{ width: '100%', minWidth: 84, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: cellPad, fontFamily: 'inherit', fontSize: mobile ? 16 : 13, color: 'var(--color-accent)', fontWeight: 600 }}
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

  const onScroll = () => {
    const el = boxRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }

  return (
    <div style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: mobile ? '100%' : DESKTOP_MAX, width: scaled && natW ? natW * scale : (mobile ? '100%' : 'fit-content') }}>
      <div
        ref={boxRef}
        className="no-scrollbar"
        onScroll={onScroll}
        style={{
          // Scroll only in the mobile natural (non-compact) mode; compact clips
          // the scaled table, desktop scrolls if a table is genuinely too wide.
          overflowX: fitting ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          // Scaling shrinks the cells but not the box radius — a 16px corner then
          // eats a big chunk of the corner cells. Morph the radius down while
          // scaled so the rounding never covers content.
          borderRadius: scaled ? 6 : 16,
          transition: 'border-radius 0.22s ease',
          border, maxWidth: '100%',
          // Crop the layout box to the scaled table so there's no white gap on
          // the right or below (a CSS transform leaves the original box size).
          width: scaled && natW ? natW * scale : undefined,
          height: scaled && natH ? natH * scale : undefined,
        }}
      >
        <div style={{ transformOrigin: 'top left', transform: scaled ? `scale(${scale})` : undefined, width: 'max-content' }}>
          <table ref={tableRef} style={{ borderCollapse: 'collapse', width: 'max-content', fontSize: mobile ? 13 : 13 }}>
            <thead>
              <tr>{table.headers.map((h, c) => (
                <th key={c} style={{ borderBottom: border, borderRight: c < table.headers.length - 1 ? border : undefined, padding: cellPad, fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
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
                        padding: 0, verticalAlign: 'top', whiteSpace: 'nowrap',
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
      </div>

      {/* Light scroll-hint fades — only while scrolling is possible (not in the
          shrink-to-fit mode). Right fade until you reach the end, left once
          you've scrolled in. */}
      {!fitting && !atEnd && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, right: 1, width: 24, borderRadius: '0 15px 15px 0', pointerEvents: 'none', background: 'linear-gradient(to left, var(--color-bg), transparent)' }} />
      )}
      {!fitting && !atStart && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, width: 18, borderRadius: '15px 0 0 15px', pointerEvents: 'none', background: 'linear-gradient(to right, var(--color-bg), transparent)' }} />
      )}

      {/* Scroll ⇄ shrink-to-fit toggle (mobile only) */}
      {mobile && (
        <button
          onClick={() => setCompact(v => !v)}
          aria-label={compact ? 'Показать в натуральную величину' : 'Вписать в экран'}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 4,
            width: 32, height: 32, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--glass-rgb), 0.72)',
            backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill)',
            cursor: 'pointer', color: 'var(--color-text-2)',
            // When the whole (scaled) table is visible, the button would cover the
            // top-right cell — fade it so content reads through; tap still works.
            opacity: scaled ? 0.4 : 1,
            transition: 'opacity 0.2s ease',
          }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.opacity = scaled ? '0.4' : '1' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = scaled ? '0.4' : '1' }}
        >
          {compact ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
        </button>
      )}
    </div>
  )
}
